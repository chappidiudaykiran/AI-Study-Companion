import { createContext, useContext } from 'react';

// Shared breadcrumb trail: [{ label, to? }]. Pages set it, Topbar renders it.
// Kept in its own module to avoid App ↔ pages import cycles.
const CrumbCtx = createContext({ crumbs: [], setCrumbs: () => {} });
export const useCrumbs = () => useContext(CrumbCtx);
export default CrumbCtx;
