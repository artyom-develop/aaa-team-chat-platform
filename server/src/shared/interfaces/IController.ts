import { Router } from 'express';

export interface IController {
  readonly router: Router;
}
