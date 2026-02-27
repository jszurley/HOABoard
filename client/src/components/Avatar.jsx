import './Avatar.css';

export default function Avatar({ name, url, size = 40 }) {
  const initials = name
    ? name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
    : '?';

  if (url) {
    return (
      <img
        className="avatar"
        src={url}
        alt={name}
        style={{ width: size, height: size }}
      />
    );
  }

  const colors = ['#2E7D32', '#1565C0', '#C62828', '#AD1457', '#6A1B9A', '#00838F', '#EF6C00'];
  const colorIndex = name ? name.charCodeAt(0) % colors.length : 0;

  return (
    <div
      className="avatar avatar-initials"
      style={{
        width: size,
        height: size,
        fontSize: size * 0.4,
        backgroundColor: colors[colorIndex]
      }}
    >
      {initials}
    </div>
  );
}
