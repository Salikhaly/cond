import React, { lazy, Suspense } from 'react';
import Workspace from '../operations/Workspace';
import './styles/styles.css';
const LegacyApp = lazy(() => import('./LegacyApp'));
export default function App() {
    if (window.location.pathname.startsWith('/legacy')) return <Suspense fallback={<div>Загрузка предыдущих разделов…</div>}><LegacyApp /></Suspense>;
    return <Workspace />;
}
