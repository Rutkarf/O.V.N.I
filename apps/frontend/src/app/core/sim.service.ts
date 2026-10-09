import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { Organism, SimJob, SimState } from './sim.models';

@Injectable({ providedIn: 'root' })
export class SimService {
  private readonly http = inject(HttpClient);

  state(): Observable<SimState> {
    return this.http.get<SimState>('/api/v1/sim/state');
  }

  tick(mode?: string): Observable<SimState> {
    return this.http.post<SimState>('/api/v1/sim/tick', mode ? { mode } : {});
  }

  reset(mode?: string): Observable<SimState> {
    return this.http.post<SimState>('/api/v1/sim/reset', mode ? { mode } : {});
  }

  setMode(mode: string): Observable<SimState> {
    return this.http.post<SimState>('/api/v1/sim/mode', { mode });
  }

  listOrganisms(): Observable<Organism[]> {
    return this.http.get<Organism[]>('/api/v1/organisms');
  }

  createOrganism(name: string, species?: string): Observable<Organism> {
    return this.http.post<Organism>('/api/v1/organisms', { name, species });
  }

  listJobs(): Observable<SimJob[]> {
    return this.http.get<SimJob[]>('/api/v1/jobs');
  }

  createJob(body: {
    organismId: string;
    mode?: string;
    ticks?: number;
    seed?: number;
  }): Observable<SimJob> {
    return this.http.post<SimJob>('/api/v1/jobs', body);
  }

  getJob(id: string): Observable<SimJob> {
    return this.http.get<SimJob>(`/api/v1/jobs/${id}`);
  }
}
