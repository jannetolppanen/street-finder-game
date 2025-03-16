import React from 'react';
import './App.css';
import HomePage from './HomePage';
import StreetFinder from './StreetFinder';
import DistrictFinder from './DistrictFinder';
import StreetFinderV2 from './StreetFinderV2';
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
            <Button color="inherit" component={Link} to="/streets">Streets</Button>
            <Button color="inherit" component={Link} to="/districts">Districts</Button>
            <Button color="inherit" component={Link} to="/streetsv2">Streets v2</Button>
          </Toolbar>
        </AppBar>
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/streets" element={<StreetFinder />} />
          <Route path="/districts" element={<DistrictFinder />} />
          <Route path="/streetsv2" element={<StreetFinderV2 />} />
        </Routes>
      </div>
    </Router>
  );
}

export default App;
