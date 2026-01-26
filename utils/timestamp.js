export function formatTimestamp(timezone = 'America/New_York') {
  const timestamp = new Date();
  
  const options = {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: true,
    timeZone: timezone,
  };
  
  const formatter = new Intl.DateTimeFormat('en-US', options);
  const parts = formatter.formatToParts(timestamp);
  
  const date = `${parts[2].value}/${parts[0].value}/${parts[4].value}`;
  const time = `${parts[6].value}:${parts[8].value}:${parts[10].value}${parts[12].value}`;
  
  return `${date} ${time} ${timezone.split('/')[1] || 'EST'}`;
}

export function getESTTimestamp() {
  return formatTimestamp('America/New_York');
}