export async function seedDemo() {
  const res = await fetch('http://127.0.0.1:8000/demo/seed', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
  })
  if (!res.ok) throw new Error('Seed failed')
  return res.json()
}
