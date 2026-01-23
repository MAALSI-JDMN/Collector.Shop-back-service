import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Home from './pages/Home';
import HomeKeycloak from './pages/HomeKeycloak';
import HomeHydra from './pages/HomeHydra';
import Login from './pages/Login';
import './App.css';
import {RegisterHydra} from "./pages/RegisterHydra.tsx";
import {LoginHydra} from "./pages/LoginHydra.tsx";
import CallbackHydra from "./pages/CallbackHydra.tsx";

function App() {
    return (
        <Router>
            <Routes>
                <Route path="/" element={<Home />} />
                <Route path="/home-keycloak" element={<HomeKeycloak />} />
                <Route path="/home-hydra" element={<HomeHydra />} />
                <Route path="/login" element={<Login />} />
                <Route path="/register-hydra" element={<RegisterHydra />} />
                <Route path="/login-hydra" element={<LoginHydra />} />
                <Route path="/callback-hydra" element={<CallbackHydra />} />
            </Routes>
        </Router>
    );
}

export default App;