import {isValidLocalDate} from './moneyRecurrence';
import {localDateKey} from './period';
import type {Task} from '../types/domain';

export interface TaskAgendaDay {
  localDate: string;
  tasks: Task[];
}

export function buildTaskAgenda(tasks: readonly Task[], startLocalDate: string, dayCount: number): TaskAgendaDay[] {
  if (!isValidLocalDate(startLocalDate)) {
    throw new Error('Agenda start date is invalid.');
  }
  if (!Number.isSafeInteger(dayCount) || dayCount < 1 || dayCount > 31) {
    throw new Error('Agenda number of days must be from 1 to 31.');
  }

  const start = parseLocalDate(startLocalDate);
  const dates: string[] = [];
  const tasksByDate = new Map<string, Task[]>();
  for (let index = 0; index < dayCount; index += 1) {
    const date = new Date(start);
    date.setDate(start.getDate() + index);
    const localDate = localDateKey(date);
    dates.push(localDate);
    tasksByDate.set(localDate, []);
  }

  for (const task of tasks) {
    if (task.dueLocalDate === null) {
      continue;
    }
    const dayTasks = tasksByDate.get(task.dueLocalDate);
    if (dayTasks) {
      dayTasks.push(task);
    }
  }

  return dates
    .map(localDate => ({localDate, tasks: tasksByDate.get(localDate) as Task[]}))
    .filter(day => day.tasks.length > 0);
}

function parseLocalDate(localDate: string): Date {
  const [year, month, day] = localDate.split('-').map(Number);
  return new Date(year, month - 1, day);
}
