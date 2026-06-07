import { type Database, type Property } from '../../store/databaseStore';

interface Props { database: Database; onUpdate?: () => void }

function findDateRange(props: Property[]): { start: Property | null; end: Property | null } {
  const dates = props.filter(p => p.type === 'date');
  return { start: dates[0] || null, end: dates[1] || null };
}

export function TimelineView({ database }: Props) {
  const { start, end } = findDateRange(database.properties);
  const nameProp = database.properties.find(p => p.type === 'text');

  if (!start) {
    return <div className="db-timeline-empty"><p>Add at least one Date property to enable Timeline view.</p></div>;
  }

  type TimelineItem = { rec: typeof database.records[0]; date: string; isEnd?: boolean; name: string };
  const items: TimelineItem[] = [];

  for (const rec of database.records) {
    const s = String(rec.values[start.id] ?? '');
    if (!s) continue;
    items.push({ rec, date: s, name: String(rec.values[nameProp?.id ?? ''] || 'Untitled') });
    if (end) {
      const e = String(rec.values[end.id] ?? '');
      if (e && e !== s) items.push({ rec, date: e, isEnd: true, name: String(rec.values[nameProp?.id ?? ''] || 'Untitled') });
    }
  }

  items.sort((a, b) => a.date.localeCompare(b.date));

  if (items.length === 0) {
    return <div className="db-timeline-empty"><p>No records with dates to display on the timeline.</p></div>;
  }

  return (
    <div className="db-timeline-view">
      {items.map((item, i) => (
        <div key={`${item.rec.id}-${i}`} className={`timeline-item${item.isEnd ? ' end' : ''}`}>
          <div className="timeline-dot" />
          <div className="timeline-content">
            <span className="timeline-date">{item.date}</span>
            <span className="timeline-name">{item.name}</span>
          </div>
        </div>
      ))}
    </div>
  );
}
