import React from 'react';
import './App.css';
import StreetFinder from './StreetFinder';
import AppBar from '@mui/material/AppBar';
import Toolbar from '@mui/material/Toolbar';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import { BrowserRouter as Router, Route, Routes, Link } from 'react-router-dom';

function App() {
  return (
    <Router>
      <div className="App">
        <AppBar position="static">
          <Toolbar>
            <Typography variant="h6" style={{ flexGrow: 1 }}>
              Street Finder Game
            </Typography>
            <Button color="inherit" component={Link} to="/">Home</Button>
            <Button color="inherit" component={Link} to="/mode1">Mode 1</Button>
            <Button color="inherit" component={Link} to="/mode2">Mode 2</Button>
          </Toolbar>
        </AppBar>
        <Routes>
          <Route path="/" element={<StreetFinder />} />
          <Route path="/mode1" element={<div>Mode 1</div>} />
          <Route path="/mode2" element={<div>Mode 2</div>} />
        </Routes>
      </div>
    </Router>
  );
}

export default App;
