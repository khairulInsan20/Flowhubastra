export default function AccessDenied({ feature, roles }) {
  return (
    <section className="page-content" data-testid="access-denied-page">
      <div className="access-denied" data-testid="access-denied-message">
        <p className="eyebrow">AKSES DIBATASI</p>
        <h1>{feature}</h1>
        <p>Menu ini hanya tersedia untuk {roles}.</p>
      </div>
    </section>
  );
}