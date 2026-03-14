export function arrayMove(arr, from, to) {
  const next = arr.slice();
  const [item] = next.splice(from, 1);
  next.splice(to, 0, item);
  return next;
}

const ROLES    = ["Engineer","Designer","PM","QA","DevOps","Analyst","Lead","Manager"];
const STATUSES = ["Active","Inactive","On Leave","Pending","Terminated"];
const DEPTS    = ["Engineering","Design","Product","Marketing","Sales","HR","Finance","Support"];
const CITIES   = ["New York","London","Berlin","Tokyo","Sydney","Toronto","Mumbai","Paris"];
const FIRST    = ["Alice","Bob","Carol","Dan","Eve","Frank","Grace","Hank","Ivy","Jack"];
const LAST     = ["Johnson","Smith","White","Brown","Davis","Lee","Kim","Miller","Chen","Park"];

export function generateRows(count) {
  return Array.from({ length: count }, (_, i) => ({
    id:         `row-${i}`,
    name:       `${FIRST[i % FIRST.length]} ${LAST[Math.floor(i / FIRST.length) % LAST.length]}`,
    role:       ROLES[i % ROLES.length],
    status:     STATUSES[i % STATUSES.length],
    email:      `${FIRST[i % FIRST.length].toLowerCase()}${i}@company.com`,
    department: DEPTS[i % DEPTS.length],
    location:   CITIES[i % CITIES.length],
    salary:     `$${40 + (i % 160)}k`,
    joined:     `${2019 + (i % 6)}-${String((i % 12) + 1).padStart(2, "0")}`,
    score:      i % 101,
  }));
}

const V_STATUSES = ["Active","Inactive","Pending","On Leave","Terminated"];
const V_DEPTS    = ["Engineering","Sales","Marketing","HR","Finance","Legal","Support","Product"];

export function generateData(count) {
  return Array.from({ length: count }, (_, i) => ({
    id:         `row-${i}`,
    firstName:  `First${i}`,
    lastName:   `Last${i}`,
    email:      `user${i}@company.com`,
    phone:      `+1-${String(i).padStart(10, "0")}`,
    company:    `Company ${i % 500}`,
    jobTitle:   `Title ${i % 200}`,
    department: V_DEPTS[i % V_DEPTS.length],
    city:       `City ${i % 80}`,
    state:      `State ${i % 50}`,
    country:    `Country ${i % 30}`,
    zipCode:    String(10000 + (i % 90000)),
    address:    `${i} Main St`,
    age:        18 + (i % 62),
    salary:     `$${(30 + (i % 170)) * 1000}`,
    startDate:  `2020-${String((i % 12) + 1).padStart(2, "0")}-${String((i % 28) + 1).padStart(2, "0")}`,
    status:     V_STATUSES[i % V_STATUSES.length],
    score:      i % 101,
    rating:     ((i % 50) / 10 + 0.5).toFixed(1),
    category:   V_DEPTS[i % V_DEPTS.length],
    notes:      `Note for row ${i}`,
  }));
}
