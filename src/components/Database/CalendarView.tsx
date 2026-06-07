import { type Database, type Property } from '../../store/databaseStore';

interface Props { database: Database; onUpdate?: () => void }

function findDateProp(props: Property[]): Property | null {
  return props.find(p => p.type === 'date') || null;
}

export function CalendarView({ database }: Props) {
  const dateProp = findDateProp(database.properties);
  const nameProp = database.properties.find(p => p.type === 'text');

  if (!dateProp) {
    return <div className="db-calendar-empty"><p>Add a Date property to enable Calendar view.</p></div>;
  }

  // Group by date
  const grouped = new Map<string, typeof database.records>();
  for (const rec of database.records) {
    const date = String(rec.values[dateProp.id] ?? '');
    if (!date) continue;
    if (!grouped.has(date)) grouped.set(date, []);
    grouped.get(date)!.push(rec);
  }

  const days = Array.from(grouped.entries()).sort(([a], [b]) => a.localeCompare(b));
  const today = new Date().toISOString().slice(0, 10);

  return (
    <div className="db-calendar-view">
      {days.map(([date, recs]) => (
        <div key={date} className={`calendar-day${date === today ? ' today' : ''}`}>
          <div className="cal-date">{date}</div>
          {recs.map(rec => (
            <div key={rec.id} className="cal-event">{String(rec.values[nameProp?.id ?? ''] || 'Untitled')}</div>
          ))}
        </div>
      ))}
      {days.length === 0 && <p className="cal-empty">No records with dates. Add date values to display them here.</p>}
    </div>
  );
}
