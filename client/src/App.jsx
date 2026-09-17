import { Routes, Route, Navigate } from 'react-router-dom';
import Home from './pages/Home.jsx';
import Login from './pages/Login.jsx';
import Project from './pages/Project.jsx';
import Admin from './pages/Admin.jsx';

function guard(el) {
  return localStorage.getItem('token') ? el : <Navigate to="/login" />;
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/" element={guard(<Home />)} />
      <Route path="/project/:id" element={guard(<Project />)} />
      <Route path="/admin" element={guard(<Admin />)} />
    </Routes>
  );
}
