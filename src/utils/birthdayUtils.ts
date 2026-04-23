import { FamilyGraph, RelationshipResult } from '../models/types';

export interface BirthdayPerson {
  id: string;
  name: string;
  title: string;
  dayOffset: 0 | 1; // 0=오늘, 1=내일
}

export function getBirthdayPersons(
  graph: FamilyGraph,
  perspectivePersonId: string,
  relationships: Map<string, RelationshipResult>
): BirthdayPerson[] {
  const today = new Date();
  const results: BirthdayPerson[] = [];

  for (const [id, person] of Object.entries(graph.persons)) {
    if (!person.birthMonthDay) continue;
    const [bm, bd] = person.birthMonthDay.split('-').map(Number);

    for (const offset of [0, 1] as const) {
      const check = new Date(today);
      check.setDate(today.getDate() + offset);
      if (check.getMonth() + 1 === bm && check.getDate() === bd) {
        const rel = relationships.get(id);
        const title = id === perspectivePersonId ? '나' : (rel?.title || person.name);
        results.push({ id, name: person.name, title, dayOffset: offset });
        break;
      }
    }
  }

  return results;
}

export function formatBirthdayMessage(persons: BirthdayPerson[]): { today: string[]; tomorrow: string[] } {
  const today = persons.filter(p => p.dayOffset === 0).map(p => `${p.name}(${p.title})`);
  const tomorrow = persons.filter(p => p.dayOffset === 1).map(p => `${p.name}(${p.title})`);
  return { today, tomorrow };
}
