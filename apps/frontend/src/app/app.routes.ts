import { Routes } from '@angular/router';
import { Login } from './auth/login';
import { authGuard, loginRedirect } from './core/auth.guard';
import { Lab } from './lab/lab';
import { Organisms } from './organisms/organisms';
import { AtlasPage } from './science/atlas/atlas';
import { BatchPage } from './science/batch/batch';
import { DataPage } from './science/data/data';
import { ExperimentPage } from './science/experiment/experiment';
import { RulesPage } from './science/rules/rules';
import { RunsPage } from './science/runs/runs';
import { PasserellesPage } from './science/passerelles/passerelles';
import { ValidationPage } from './science/validation/validation';
import { WorkflowPage } from './science/workflow/workflow';
import { PublicationPage } from './science/publication/publication';
import { VoixTerminalPage } from './science/voix-terminal/voix-terminal';

export const routes: Routes = [
  { path: '', pathMatch: 'full', redirectTo: 'lab' },
  { path: 'login', component: Login, canActivate: [loginRedirect] },
  { path: 'lab', component: Lab, canActivate: [authGuard] },
  { path: 'atlas', component: AtlasPage, canActivate: [authGuard] },
  { path: 'experiment', component: ExperimentPage, canActivate: [authGuard] },
  { path: 'rules', component: RulesPage, canActivate: [authGuard] },
  { path: 'batch', component: BatchPage, canActivate: [authGuard] },
  { path: 'runs', component: RunsPage, canActivate: [authGuard] },
  { path: 'data', component: DataPage, canActivate: [authGuard] },
  { path: 'passerelles', component: PasserellesPage, canActivate: [authGuard] },
  { path: 'workflow', component: WorkflowPage, canActivate: [authGuard] },
  { path: 'validation', component: ValidationPage, canActivate: [authGuard] },
  { path: 'publication', component: PublicationPage, canActivate: [authGuard] },
  { path: 'voix', component: VoixTerminalPage, canActivate: [authGuard] },
  { path: 'organisms', component: Organisms, canActivate: [authGuard] },
];
