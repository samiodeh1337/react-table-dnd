// Shared data generation for examples

export interface Row {
  id: string
  name: string
  role: string
  status: string
  email: string
  department: string
  location: string
  salary: string
  joined: string
  score: number
  [key: string]: string | number
}

const ROLES = ['Engineer', 'Designer', 'PM', 'QA', 'DevOps', 'Analyst', 'Lead', 'Manager']
const STATUSES = ['Active', 'Inactive', 'On Leave', 'Pending', 'Terminated']
const DEPTS = ['Engineering', 'Design', 'Product', 'Marketing', 'Sales', 'HR', 'Finance', 'Support']
const CITIES = ['New York', 'London', 'Berlin', 'Tokyo', 'Sydney', 'Toronto', 'Mumbai', 'Paris']
const FIRST = ['Alice', 'Bob', 'Carol', 'Dan', 'Eve', 'Frank', 'Grace', 'Hank', 'Ivy', 'Jack']
const LAST = ['Johnson', 'Smith', 'White', 'Brown', 'Davis', 'Lee', 'Kim', 'Miller', 'Chen', 'Park']

export function generateRows(count: number): Row[] {
  const rows: Row[] = new Array(count)
  for (let i = 0; i < count; i++) {
    const first = FIRST[i % FIRST.length]
    const last = LAST[Math.floor(i / FIRST.length) % LAST.length]
    rows[i] = {
      id: `row-${i}`,
      name: `${first} ${last}`,
      role: ROLES[i % ROLES.length],
      status: STATUSES[i % STATUSES.length],
      email: `${first.toLowerCase()}${i}@company.com`,
      department: DEPTS[i % DEPTS.length],
      location: CITIES[i % CITIES.length],
      salary: `$${40 + (i % 160)}k`,
      joined: `${2019 + (i % 6)}-${String((i % 12) + 1).padStart(2, '0')}`,
      score: i % 101,
    }
  }
  return rows
}

export function arrayMove<T>(arr: T[], from: number, to: number): T[] {
  const next = arr.slice()
  const [item] = next.splice(from, 1)
  next.splice(to, 0, item)
  return next
}
