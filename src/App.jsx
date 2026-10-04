import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Frontpage from './components/Frontpage';
import MainPage from './components/Main-page';
import LiveCall from './components/Live-call';
import MessagesPage from './components/Messegespage';
import PhotoboothPage from './components/Photobooth-page';
import PhotoboothSoloPage from './components/Photoboothsolo-page';
import PhotoboothDuo from './components/PhotoboothDuo-page';
import UserProfilePage from './components/Users-profilepage';
import './style/App.css';

export default function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Frontpage />} />
        <Route path="/main" element={<MainPage />} />
        <Route path="/live-call" element={<LiveCall />} />
        <Route path="/messages" element={<MessagesPage />} />
        <Route path="/photobooth" element={<PhotoboothPage />} />
        <Route path="/photobooth/solo" element={<PhotoboothSoloPage />} />
        <Route path="/photobooth/duo" element={<PhotoboothDuo />} />
        <Route path="/profile" element={<UserProfilePage />} />
      </Routes>
    </Router>
  );
}