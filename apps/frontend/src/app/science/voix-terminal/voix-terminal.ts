import { Component, ElementRef, OnInit, ViewChild, inject, input, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { ClaimBanner } from '../../core/claim-banner';
import { InstrumentStore } from '../../core/instrument.store';
import { ScienceService } from '../../core/science.service';
import { findBrain, findMotif } from '../../organism-select/hybrid-composition';

type LineKind = 'sys' | 'in' | 'out' | 'ok' | 'err' | 'muted' | 'banner';

interface TermLine {
  kind: LineKind;
  text: string;
}

@Component({
  selector: 'app-voix-terminal',
  imports: [FormsModule, ClaimBanner, RouterLink],
  templateUrl: './voix-terminal.html',
  styleUrl: './voix-terminal.css',
})
export class VoixTerminalPage implements OnInit {
  private readonly science = inject(ScienceService);
  readonly store = inject(InstrumentStore);

  /** Compact Kali window for Labo 3D (bottom-left). */
  readonly embedded = input(false);

  @ViewChild('scrollBox') scrollBox?: ElementRef<HTMLDivElement>;
  @ViewChild('cmdInput') cmdInput?: ElementRef<HTMLInputElement>;

  readonly lines = signal<TermLine[]>([]);
  readonly busy = signal(false);
  readonly mode = signal<'gabarit' | 'llm'>('gabarit');
  readonly boundRunId = signal<string | null>(null);
  readonly lastVerif = signal<string>('');
  readonly fichePreview = signal('');
  readonly error = signal('');
  readonly collapsed = signal(false);

  command = '';
  sugar = 0.2;
  bitter = 0;
  looming = 0.9;
  hunger = 0.4;
  seed = 7;

  private history: string[] = [];
  private histIdx = -1;

  ngOnInit(): void {
    const last = this.store.lastRun()?.run_card?.run_id;
    if (last) this.boundRunId.set(last);
    this.boot();
    if (!this.embedded()) this.refreshFiche();
  }

  toggleCollapsed(): void {
    this.collapsed.update((v) => !v);
  }

  crossing(): string {
    const org = this.store.selectedOrganismLabel() || '?';
    const motif = findMotif(this.store.selectedMotifId())?.name ?? this.store.selectedMotifId();
    const brain = findBrain(this.store.selectedBrainAtlasId())?.name ?? this.store.selectedBrainAtlasId();
    return `${org} × ${motif} × ${brain}`;
  }

  promptHost(): string {
    const mid = (this.store.selectedMotifId() || 'chimere').slice(0, 18);
    return `ovni@${mid}`;
  }

  fichePayload(): Record<string, unknown> {
    const motif = findMotif(this.store.selectedMotifId());
    const brain = findBrain(this.store.selectedBrainAtlasId());
    return {
      organism_id: this.store.selectedOrganismId(),
      organism_label: this.store.selectedOrganismLabel(),
      motif_id: this.store.selectedMotifId(),
      motif_label: motif?.name ?? this.store.selectedMotifId(),
      atlas_id: this.store.selectedBrainAtlasId(),
      atlas_label: brain?.name ?? this.store.selectedBrainAtlasId(),
      neuron_count_lif: motif?.neuronCount,
      proxy_count_atlas: brain?.proxyCount,
      locked: true,
    };
  }

  private boot(): void {
    this.push('banner', '┌─ O.V.N.I. terminal · voix pédagogique · hors preuve ─┐');
    this.push('sys', 'Kali-style shell · cerveau = LIF · parole = gabarit (± Ollama)');
    this.push('sys', `Croisement: ${this.crossing()}`);
    this.push('muted', 'Tapez help — ou utilisez les boutons du dock.');
    this.push('muted', this.boundRunId() ? `Essai lié: ${this.boundRunId()}` : 'Aucun essai lié — stimulate ou bind.');
  }

  private push(kind: LineKind, text: string): void {
    this.lines.update((xs) => [...xs, { kind, text }]);
    queueMicrotask(() => this.scrollBottom());
  }

  private scrollBottom(): void {
    const el = this.scrollBox?.nativeElement;
    if (el) el.scrollTop = el.scrollHeight;
  }

  focusCmd(): void {
    this.cmdInput?.nativeElement?.focus();
  }

  refreshFiche(): void {
    this.science.voixFiche(this.fichePayload()).subscribe({
      next: (f) => {
        const fiche = (f['fiche'] as Record<string, unknown>) || {};
        this.fichePreview.set(
          [
            `organisme: ${fiche['organism_label']}`,
            `motif:     ${fiche['motif_id']}`,
            `atlas:     ${fiche['atlas_label']}`,
            `circuit:   ${f['circuit_id']}`,
            `neurones:  ${((f['neuron_ids'] as string[]) || []).length}`,
            `complet:   ${f['complete'] ? 'oui' : 'non'}`,
            `claim:     ${f['claim_level']}`,
          ].join('\n'),
        );
      },
      error: (e) => this.error.set(String(e?.error?.error || e?.message || e)),
    });
  }

  onKey(ev: KeyboardEvent): void {
    if (ev.key === 'ArrowUp') {
      ev.preventDefault();
      if (!this.history.length) return;
      this.histIdx = Math.min(this.history.length - 1, this.histIdx + 1);
      this.command = this.history[this.history.length - 1 - this.histIdx] || '';
    } else if (ev.key === 'ArrowDown') {
      ev.preventDefault();
      this.histIdx = Math.max(-1, this.histIdx - 1);
      this.command =
        this.histIdx < 0 ? '' : this.history[this.history.length - 1 - this.histIdx] || '';
    }
  }

  submit(): void {
    const raw = this.command.trim();
    if (!raw || this.busy()) return;
    this.history.push(raw);
    this.histIdx = -1;
    this.command = '';
    this.push('in', `${this.promptHost()}:~$ ${raw}`);
    void this.dispatch(raw);
  }

  quick(cmd: string): void {
    this.command = cmd;
    this.submit();
  }

  setMode(m: 'gabarit' | 'llm'): void {
    this.mode.set(m);
    this.push('ok', `mode → ${m}${m === 'llm' ? ' (Ollama optionnel, fallback gabarit)' : ''}`);
  }

  private async dispatch(raw: string): Promise<void> {
    const [head, ...rest] = raw.split(/\s+/);
    const arg = rest.join(' ').trim();
    const cmd = head.toLowerCase();

    try {
      if (cmd === 'help' || cmd === '?') {
        await this.runHelp();
        return;
      }
      if (cmd === 'clear' || cmd === 'cls') {
        this.lines.set([]);
        this.boot();
        return;
      }
      if (cmd === 'claim') {
        this.push(
          'out',
          'Claim = pédagogie. Preuve = connectome LIF + run_card. LLM ≠ mécanisme neural (CHARTER.md).',
        );
        return;
      }
      if (cmd === 'whoami' || cmd === 'fiche') {
        await this.runFiche();
        return;
      }
      if (cmd === 'status') {
        await this.runStatus();
        return;
      }
      if (cmd === 'lexique') {
        await this.runLexique();
        return;
      }
      if (cmd === 'gabarit') {
        await this.runGabarit();
        return;
      }
      if (cmd === 'bind') {
        if (!arg) {
          this.push('err', 'usage: bind <run_id>');
          return;
        }
        this.boundRunId.set(arg);
        this.push('ok', `essai lié → ${arg}`);
        await this.runGabarit();
        return;
      }
      if (cmd === 'last') {
        const id = this.store.lastRun()?.run_card?.run_id;
        if (!id) {
          this.push('err', 'pas de lastRun dans le Labo — stimulate d’abord');
          return;
        }
        this.boundRunId.set(id);
        this.push('ok', `essai lié (last) → ${id}`);
        return;
      }
      if (cmd === 'mode') {
        if (arg === 'gabarit' || arg === 'llm') {
          this.setMode(arg);
        } else {
          this.push('err', 'usage: mode gabarit|llm');
        }
        return;
      }
      if (cmd === 'ask' || cmd === 'parle' || cmd === 'q') {
        if (!arg) {
          this.push('err', 'usage: ask <question>');
          return;
        }
        await this.runAsk(arg);
        return;
      }
      if (cmd === 'verify' || cmd === 'verif' || cmd === 'double') {
        await this.runVerify(arg || undefined);
        return;
      }
      if (cmd === 'stimulate' || cmd === 'stim') {
        await this.runStimulate(arg);
        return;
      }
      if (cmd === 'replay') {
        await this.runReplay();
        return;
      }
      if (cmd === 'journal') {
        await this.runJournal();
        return;
      }
      if (cmd === 'export') {
        this.science.downloadVoixJournal();
        this.push('ok', 'export voix-journal.md lancé');
        return;
      }
      if (cmd === 'quit' || cmd === 'exit') {
        this.push('sys', 'Session locale conservée — naviguez via le menu (Voix).');
        return;
      }
      // Phrase libre = ask
      await this.runAsk(raw);
    } catch (e) {
      this.push('err', String(e));
    }
  }

  private bodyBase(extra: Record<string, unknown> = {}): Record<string, unknown> {
    return {
      ...this.fichePayload(),
      fiche: this.fichePayload(),
      run_id: this.boundRunId(),
      mode: this.mode(),
      ...extra,
    };
  }

  private runHelp(): Promise<void> {
    this.busy.set(true);
    return new Promise((resolve) => {
      this.science.voixAide().subscribe({
        next: (r) => {
          const help = String(r['help'] || '');
          help.split('\n').forEach((l) => this.push('muted', l));
          this.busy.set(false);
          resolve();
        },
        error: (e) => {
          this.push('err', String(e?.error?.error || e.message || e));
          this.busy.set(false);
          resolve();
        },
      });
    });
  }

  private runFiche(): Promise<void> {
    this.busy.set(true);
    return new Promise((resolve) => {
      this.science.voixFiche(this.fichePayload()).subscribe({
        next: (f) => {
          this.push('out', JSON.stringify(f['fiche'], null, 2));
          this.push('muted', `complete=${f['complete']} · claim=${f['claim_level']}`);
          this.refreshFiche();
          this.busy.set(false);
          resolve();
        },
        error: (e) => {
          this.push('err', String(e?.error?.error || e.message || e));
          this.busy.set(false);
          resolve();
        },
      });
    });
  }

  private runStatus(): Promise<void> {
    this.busy.set(true);
    return new Promise((resolve) => {
      this.science.voixGabarit(this.bodyBase()).subscribe({
        next: (g) => {
          const etat = (g['etat'] as Record<string, unknown>) || {};
          if (!etat['ok']) {
            this.push('err', String(etat['error'] || 'pas d’essai'));
          } else {
            this.push('out', `run_id  ${etat['run_id']}`);
            this.push('out', `action  ${etat['action']} (${etat['action_fr']})`);
            this.push('out', `seed    ${etat['seed']}`);
            const top = (etat['top_neurones'] as { id: string; hz: number }[]) || [];
            top.forEach((t) => this.push('ok', `  ${t.id.padEnd(16)} ${t.hz} Hz`));
          }
          this.busy.set(false);
          resolve();
        },
        error: (e) => {
          this.push('err', String(e?.error?.error || e.message || e));
          this.busy.set(false);
          resolve();
        },
      });
    });
  }

  private runLexique(): Promise<void> {
    this.busy.set(true);
    return new Promise((resolve) => {
      this.science.voixLexique(this.fichePayload()).subscribe({
        next: (lex) => {
          this.push('out', `neurones: ${((lex['neurones'] as string[]) || []).join(', ')}`);
          this.push('out', `canaux:   ${((lex['canaux'] as string[]) || []).join(', ')}`);
          this.push('out', `rois:     ${((lex['rois'] as string[]) || []).join(', ') || '—'}`);
          this.busy.set(false);
          resolve();
        },
        error: (e) => {
          this.push('err', String(e?.error?.error || e.message || e));
          this.busy.set(false);
          resolve();
        },
      });
    });
  }

  private runGabarit(): Promise<void> {
    this.busy.set(true);
    return new Promise((resolve) => {
      this.science.voixGabarit(this.bodyBase()).subscribe({
        next: (g) => {
          ((g['phrases'] as string[]) || []).forEach((p) => this.push('out', p));
          this.busy.set(false);
          resolve();
        },
        error: (e) => {
          this.push('err', String(e?.error?.error || e.message || e));
          this.busy.set(false);
          resolve();
        },
      });
    });
  }

  private runAsk(question: string): Promise<void> {
    this.busy.set(true);
    return new Promise((resolve) => {
      this.science.voixDialoguer(this.bodyBase({ question })).subscribe({
        next: (r) => {
          const prefix = r['llm_used'] ? 'chimère[llm]' : 'chimère[gabarit]';
          this.push('out', `${prefix}> ${r['texte']}`);
          const dv = (r['double_verif'] as Record<string, unknown>) || {};
          const verdict = String(dv['verdict'] || '?');
          this.lastVerif.set(verdict);
          this.push(verdict === 'PASS' ? 'ok' : 'err', `double_verif ${verdict} · ${dv['message']}`);
          if (r['refused']) this.push('muted', `refus: ${r['refuse_raison']}`);
          if (r['llm_rejected']) this.push('err', `LLM rejeté → fallback gabarit (${r['llm_reject_reason']})`);
          this.busy.set(false);
          resolve();
        },
        error: (e) => {
          this.push('err', String(e?.error?.error || e.message || e));
          this.busy.set(false);
          resolve();
        },
      });
    });
  }

  private runVerify(question?: string): Promise<void> {
    this.busy.set(true);
    const body = question
      ? this.bodyBase({ question })
      : this.bodyBase({
          texte: this.lines()
            .filter((l) => l.kind === 'out')
            .slice(-1)[0]?.text,
          champs_cites: { run_id: this.boundRunId() },
        });
    return new Promise((resolve) => {
      this.science.voixVerify(body).subscribe({
        next: (r) => {
          const dv = (r['double_verif'] as Record<string, unknown>) || r;
          this.lastVerif.set(String(dv['verdict'] || '?'));
          this.push(
            dv['ok'] ? 'ok' : 'err',
            `${dv['verdict']}: ${dv['message'] || JSON.stringify(dv)}`,
          );
          const checks = (dv['checks'] as Record<string, unknown>[]) || [];
          checks.forEach((c) =>
            this.push(
              c['match'] === false ? 'err' : 'muted',
              `  · ${c['champ']}: attendu=${JSON.stringify(c['attendu'])} match=${c['match']}`,
            ),
          );
          this.busy.set(false);
          resolve();
        },
        error: (e) => {
          this.push('err', String(e?.error?.error || e.message || e));
          this.busy.set(false);
          resolve();
        },
      });
    });
  }

  private parseKv(arg: string): Record<string, number> {
    const out: Record<string, number> = {};
    if (!arg) return out;
    for (const part of arg.split(/\s+/)) {
      const [k, v] = part.split('=');
      if (k && v != null && !Number.isNaN(Number(v))) out[k] = Number(v);
    }
    return out;
  }

  private runStimulate(arg: string): Promise<void> {
    this.busy.set(true);
    const kv = this.parseKv(arg);
    const body = this.bodyBase({
      sugar: kv['sugar'] ?? this.sugar,
      bitter: kv['bitter'] ?? this.bitter,
      looming: kv['looming'] ?? this.looming,
      hunger: kv['hunger'] ?? this.hunger,
      seed: kv['seed'] ?? this.seed,
    });
    return new Promise((resolve) => {
      this.science.voixStimulate(body).subscribe({
        next: (r) => {
          const rid = String(r['run_id'] || '');
          this.boundRunId.set(rid);
          const run = (r['run'] as Record<string, unknown>) || {};
          this.push('ok', `LIF stimulate OK → ${rid} · action=${run['action']}`);
          const g = (r['gabarit'] as Record<string, unknown>) || {};
          ((g['phrases'] as string[]) || []).slice(0, 4).forEach((p) => this.push('out', p));
          // sync store lightly if shape matches
          if (run['run_card']) {
            this.store.lastRun.set(run as never);
          }
          this.busy.set(false);
          resolve();
        },
        error: (e) => {
          this.push('err', String(e?.error?.error || e.message || e));
          this.busy.set(false);
          resolve();
        },
      });
    });
  }

  private runReplay(): Promise<void> {
    const rid = this.boundRunId();
    if (!rid) {
      this.push('err', 'aucun run_id — bind ou stimulate d’abord');
      return Promise.resolve();
    }
    this.busy.set(true);
    return new Promise((resolve) => {
      this.science.voixReplay(this.bodyBase({ run_id: rid })).subscribe({
        next: (r) => {
          this.push(
            r['replay_match'] ? 'ok' : 'err',
            `replay ${r['replay_match'] ? 'MATCH' : 'ÉCART'} · of=${r['replay_of']}`,
          );
          this.busy.set(false);
          resolve();
        },
        error: (e) => {
          this.push('err', String(e?.error?.error || e.message || e));
          this.busy.set(false);
          resolve();
        },
      });
    });
  }

  private runJournal(): Promise<void> {
    this.busy.set(true);
    return new Promise((resolve) => {
      this.science.voixJournal(12).subscribe({
        next: (j) => {
          const entries = (j['entries'] as Record<string, unknown>[]) || [];
          if (!entries.length) this.push('muted', '(journal vide)');
          entries.forEach((e) => {
            const dv = (e['double_verif'] as Record<string, unknown>) || {};
            this.push(
              'muted',
              `[${String(e['created_at'] || '').slice(0, 19)}] ${e['question']} → ${dv['verdict']}`,
            );
          });
          this.busy.set(false);
          resolve();
        },
        error: (e) => {
          this.push('err', String(e?.error?.error || e.message || e));
          this.busy.set(false);
          resolve();
        },
      });
    });
  }

  dockStimulate(): void {
    this.quick(
      `stimulate sugar=${this.sugar} bitter=${this.bitter} looming=${this.looming} hunger=${this.hunger} seed=${this.seed}`,
    );
  }
}
