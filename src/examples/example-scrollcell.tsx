/**
 * Example: Scrollable cell content — rows with horizontally scrollable cells.
 * Demonstrates that touch scroll inside a cell scrolls the cell, not the table body.
 */
import React, { useCallback, useState, useMemo } from 'react'
import { TableContainer, TableHeader, ColumnCell, TableBody, BodyRow, RowCell } from '../Components'
import { arrayMove } from './example-data'
import type { DragEndResult } from '../Components'

const COLS = [
  { id: 'name', title: 'Name', width: 140 },
  { id: 'role', title: 'Role', width: 120 },
  { id: 'notes', title: 'Notes (h-scroll)', width: 220 },
  { id: 'tags', title: 'Tags (h-scroll)', width: 200 },
  { id: 'description', title: 'Description (v-scroll)', width: 220 },
  { id: 'status', title: 'Status', width: 100 },
]

const ROWS = [
  {
    id: '1',
    name: 'Alice Johnson',
    role: 'Engineer',
    notes:
      'Working on the new authentication module. Needs review from security team before merging. ETA: end of sprint.',
    tags: 'react · typescript · auth · security · backend · api',
    description:
      'Alice leads the platform security initiative.\nResponsible for OAuth2 integration.\nCoordinates with the infra team weekly.\nCurrently unblocked.',
    status: '🟢 Active',
  },
  {
    id: '2',
    name: 'Bob Martinez',
    role: 'Designer',
    notes:
      'Redesigning the onboarding flow. User research complete. Wireframes approved. Moving to high-fidelity mockups.',
    tags: 'figma · ux · onboarding · mobile · accessibility',
    description:
      'Bob owns the design system.\nCurrently iterating on mobile breakpoints.\nCollaborating with frontend on component specs.\nDelivery: next Thursday.',
    status: '🟡 Review',
  },
  {
    id: '3',
    name: 'Carol Smith',
    role: 'PM',
    notes:
      'Q2 roadmap finalized. Stakeholder sign-off received. Coordinating with engineering leads for sprint planning.',
    tags: 'roadmap · q2 · planning · stakeholders · strategy',
    description:
      'Carol manages cross-team dependencies.\nRoadmap approved by exec team.\nSprint planning scheduled for Monday.\nRisk: resource contention with data team.',
    status: '🟢 Active',
  },
  {
    id: '4',
    name: 'David Lee',
    role: 'DevOps',
    notes:
      'Migrating CI/CD pipeline to GitHub Actions. Docker images optimized. Kubernetes cluster upgrade scheduled.',
    tags: 'devops · ci-cd · docker · kubernetes · github-actions',
    description:
      'David is upgrading the K8s cluster to v1.29.\nDocker base images reduced by 40%.\nGitHub Actions migration 80% complete.\nDowntime window: Saturday 2am.',
    status: '🔵 In Progress',
  },
  {
    id: '5',
    name: 'Eva Chen',
    role: 'QA',
    notes:
      'Automated test coverage at 87%. Writing E2E tests for checkout flow. Regression suite runs in under 4 minutes.',
    tags: 'testing · playwright · e2e · automation · coverage',
    description:
      'Eva maintains the test automation framework.\nCoverage target: 90% by end of Q2.\nPlaywright suite added for checkout.\nFlaky test count reduced to 3.',
    status: '🟢 Active',
  },
  {
    id: '6',
    name: 'Frank Wilson',
    role: 'Engineer',
    notes:
      'Performance optimization sprint. Reduced bundle size by 34%. Lazy loading implemented for all route components.',
    tags: 'performance · webpack · lazy-loading · optimization · react',
    description:
      'Frank is leading the perf sprint.\nBundle size: 1.2MB → 790KB.\nLCP improved from 3.4s to 1.8s.\nNext: image optimization pipeline.',
    status: '🟡 Review',
  },
  {
    id: '7',
    name: 'Grace Kim',
    role: 'Data',
    notes:
      'Building real-time analytics dashboard. Integrating with Kafka streams. Grafana dashboards configured.',
    tags: 'analytics · kafka · grafana · data · streaming · sql',
    description:
      'Grace owns the data pipeline.\nKafka consumer lag < 200ms.\nGrafana dashboards live in staging.\nSQL query optimization ongoing.',
    status: '🔵 In Progress',
  },
  {
    id: '8',
    name: 'Henry Park',
    role: 'Engineer',
    notes:
      'Refactoring legacy payment service. Stripe integration updated to v3 API. PCI compliance review pending.',
    tags: 'payments · stripe · refactor · pci · backend · node',
    description:
      'Henry is blocked on PCI compliance sign-off.\nStripe v3 migration complete.\nLegacy code removed: 4,200 lines.\nAwaiting security audit results.',
    status: '🔴 Blocked',
  },
  {
    id: '9',
    name: 'Isla Torres',
    role: 'Engineer',
    notes:
      'Implementing real-time notifications via WebSockets. Backend complete. Frontend integration in progress.',
    tags: 'websockets · notifications · real-time · node · react · redis',
    description:
      'Isla is building the notification service.\nWebSocket server deployed to staging.\nFrontend toast component ready.\nLoad testing scheduled for Friday.',
    status: '🔵 In Progress',
  },
  {
    id: '10',
    name: 'James Nguyen',
    role: 'DevOps',
    notes:
      'Setting up observability stack. Prometheus and Grafana deployed. Alert rules configured for all critical services.',
    tags: 'prometheus · grafana · observability · alerting · sre · ops',
    description:
      'James owns the monitoring infrastructure.\nPrometheus scrape interval: 15s.\n12 alert rules active in production.\nOn-call rotation updated.',
    status: '🟢 Active',
  },
  {
    id: '11',
    name: 'Karen Liu',
    role: 'Designer',
    notes:
      'Creating the new icon library. 200+ icons designed in Figma. Export pipeline to SVG and React components automated.',
    tags: 'icons · figma · svg · design-system · react · automation',
    description:
      'Karen is leading the icon system project.\n200 icons complete, 40 in review.\nAutomated export via Figma API.\nDark mode variants in progress.',
    status: '🟡 Review',
  },
  {
    id: '12',
    name: 'Leo Patel',
    role: 'Data',
    notes:
      'Building ML pipeline for churn prediction. Feature engineering complete. Model training on AWS SageMaker.',
    tags: 'ml · python · sagemaker · churn · feature-engineering · aws',
    description:
      'Leo is training the churn prediction model.\nAUC-ROC: 0.87 on validation set.\nFeature store integrated with Redshift.\nDeployment target: end of month.',
    status: '🔵 In Progress',
  },
  {
    id: '13',
    name: 'Mia Robinson',
    role: 'PM',
    notes:
      'Coordinating the mobile app launch. App Store submission pending. Marketing campaign assets delivered.',
    tags: 'mobile · launch · app-store · marketing · coordination · ios',
    description:
      'Mia is managing the mobile launch.\nApp Store review submitted Monday.\nMarketing assets approved by brand team.\nLaunch date: April 15th.',
    status: '🟢 Active',
  },
  {
    id: '14',
    name: 'Noah Kim',
    role: 'QA',
    notes:
      'Auditing accessibility compliance. WCAG 2.1 AA gaps identified. Remediation tickets created for engineering.',
    tags: 'accessibility · wcag · a11y · audit · screen-reader · aria',
    description:
      'Noah is leading the a11y audit.\n23 WCAG violations found and ticketed.\nScreen reader testing on iOS and Android.\nTarget: full AA compliance by Q3.',
    status: '🟡 Review',
  },
  {
    id: '15',
    name: 'Olivia Scott',
    role: 'Engineer',
    notes:
      'Migrating database from PostgreSQL 13 to 16. Zero-downtime migration plan approved. Dry run completed successfully.',
    tags: 'postgresql · migration · database · zero-downtime · backend · sql',
    description:
      'Olivia is executing the DB migration.\nDry run completed in 4 minutes 12 seconds.\nRollback plan tested and documented.\nProduction migration: next maintenance window.',
    status: '🟢 Active',
  },
]

const th: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  height: 40,
  padding: '0 12px',
  fontSize: 12,
  fontWeight: 700,
  color: '#94a3b8',
  background: '#1a1a22',
  borderBottom: '2px solid #2e2e3e',
  textTransform: 'uppercase',
  letterSpacing: '0.05em',
  whiteSpace: 'nowrap',
}

const td: React.CSSProperties = {
  height: 44,
  padding: '0 12px',
  fontSize: 13,
  color: '#cbd5e1',
  background: '#14141c',
  borderBottom: '1px solid #1e1e2a',
  display: 'flex',
  alignItems: 'center',
}

const scrollCellStyle: React.CSSProperties = {
  overflowX: 'auto',
  overflowY: 'hidden',
  whiteSpace: 'nowrap',
  width: '100%',
  height: '100%',
  display: 'flex',
  alignItems: 'center',
  scrollbarWidth: 'thin',
  scrollbarColor: '#3e3e52 transparent',
  gap: 0,
}

const ScrollableCell = ({ children }: { children: React.ReactNode }) => (
  <div style={scrollCellStyle}>{children}</div>
)

const Tag = ({ label }: { label: string }) => (
  <span
    style={{
      display: 'inline-flex',
      alignItems: 'center',
      padding: '2px 8px',
      marginRight: 4,
      borderRadius: 12,
      fontSize: 11,
      fontWeight: 600,
      background: '#2d2d42',
      color: '#a5b4fc',
      whiteSpace: 'nowrap',
      flexShrink: 0,
    }}
  >
    {label}
  </span>
)

const ScrollCellExample = () => {
  const [rows, setRows] = useState(ROWS)
  const [cols, setCols] = useState(COLS)
  const options = useMemo(() => ({ columnDragRange: {}, rowDragRange: {} }), [])

  const handleDragEnd = useCallback((r: DragEndResult) => {
    if (r.sourceIndex === r.targetIndex) return
    if (r.dragType === 'row') setRows((p) => arrayMove(p, r.sourceIndex, r.targetIndex))
    else setCols((p) => arrayMove(p, r.sourceIndex, r.targetIndex))
  }, [])

  return (
    <div style={{ width: '100%' }}>
      <h3 style={{ margin: '0 0 6px', color: '#e4e4e7', fontSize: 14 }}>
        Scrollable Cells — drag rows/columns, scroll inside cells
      </h3>
      <p style={{ margin: '0 0 12px', fontSize: 12, color: '#6b7280' }}>
        The <strong style={{ color: '#a5b4fc' }}>Notes</strong> and{' '}
        <strong style={{ color: '#a5b4fc' }}>Tags</strong> columns scroll horizontally.{' '}
        <strong style={{ color: '#a5b4fc' }}>Description</strong> scrolls vertically. On mobile,
        swiping inside a cell scrolls the cell first — then overflows to the table.
      </p>
      <TableContainer
        options={options}
        onDragEnd={handleDragEnd}
        renderPlaceholder={() => (
          <div
            style={{
              width: '100%',
              height: '100%',
              background:
                'repeating-linear-gradient(45deg,#1e1e2a,#1e1e2a 5px,#26263a 5px,#26263a 10px)',
              borderRadius: 4,
            }}
          />
        )}
        style={{ height: 420, border: '1px solid #2e2e3e', borderRadius: 8 }}
      >
        <TableHeader>
          {cols.map((col, i) => (
            <ColumnCell key={col.id} id={col.id} index={i} style={{ ...th, width: col.width }}>
              {col.title}
            </ColumnCell>
          ))}
        </TableHeader>
        <TableBody>
          {rows.map((row, ri) => (
            <BodyRow key={row.id} id={row.id} index={ri}>
              {cols.map((col, ci) => (
                <RowCell key={col.id} index={ci} style={td}>
                  {col.id === 'notes' ? (
                    <ScrollableCell>
                      <span style={{ color: '#94a3b8', fontSize: 12 }}>{row.notes}</span>
                    </ScrollableCell>
                  ) : col.id === 'tags' ? (
                    <ScrollableCell>
                      {row.tags.split(' · ').map((tag) => (
                        <Tag key={tag} label={tag} />
                      ))}
                    </ScrollableCell>
                  ) : col.id === 'description' ? (
                    <div
                      style={{
                        overflowY: 'auto',
                        overflowX: 'hidden',
                        width: '100%',
                        height: '100%',
                        padding: '6px 0',
                        scrollbarWidth: 'thin',
                        scrollbarColor: '#3e3e52 transparent',
                      }}
                    >
                      {row.description.split('\n').map((line, i) => (
                        <div
                          key={i}
                          style={{
                            fontSize: 11,
                            color: '#64748b',
                            lineHeight: '1.6',
                            whiteSpace: 'nowrap',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                          }}
                        >
                          {line}
                        </div>
                      ))}
                    </div>
                  ) : (
                    row[col.id as keyof typeof row]
                  )}
                </RowCell>
              ))}
            </BodyRow>
          ))}
        </TableBody>
      </TableContainer>
    </div>
  )
}

export default ScrollCellExample
