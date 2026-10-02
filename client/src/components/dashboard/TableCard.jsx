// TableCard. 페이지에서 표를 보여 주는 유일한 방법. 카드 머리(제목, 건수, 버튼, 필터) + 가장자리까지 닿는 표.
// 표 데이터는 DataTable props 를 그대로 받는다. 표가 아닌 내용(히트맵 등)은 children 으로 넣는다.
import Card from '../ui/Card.jsx'
import DataTable from './DataTable.jsx'

export default function TableCard({
  title, count, desc, actions, filters, headingLevel = 2, className, children, as, ...table
}) {
  return (
    <Card as={as} padding="none" title={title} meta={count} desc={desc} actions={actions} toolbar={filters} headingLevel={headingLevel} className={className}>
      {children ?? <DataTable {...table} />}
    </Card>
  )
}
