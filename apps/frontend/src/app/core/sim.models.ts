export interface SimSensors {
  sugar: number;
  bitter: number;
  looming: number;
  hunger: number;
}

export interface SimState {
  tick: number;
  mode: 'rules' | 'fruitfly' | string;
  busy: boolean;
  error: string;
  alive: boolean;
  cause_of_death: string;
  energy: number;
  sensors: SimSensors;
  fly: { x: number; z: number; heading: number };
  food: { x: number; z: number; sugar: number; bitter: number };
  threat: { active: boolean; looming: number };
  action: string;
  brain: string;
  outcome: string;
  events: string[];
  memory: {
    sugar: number;
    bitter: number;
    looming: number;
    hunger: number;
    updates: number;
    valence_now: number | null;
  };
}

export interface Organism {
  id: string;
  name: string;
  species: string;
  status: string;
  createdAt: string;
  updatedAt?: string;
}

export interface SimJob {
  id: string;
  organismId: string;
  type: string;
  status: string;
  mode: string;
  ticks: number;
  seed: number | null;
  attemptCount: number;
  result: string | null;
  errorMessage: string | null;
  createdAt: string;
  startedAt: string | null;
  finishedAt: string | null;
}
