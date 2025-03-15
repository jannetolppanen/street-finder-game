import React, { useState, useEffect, useRef, useCallback } from 'react';
import { MapContainer, TileLayer, useMapEvents, Marker, Popup, Polygon } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import districtsData from './data/turku_districts_all.json';
import { Box, Typography, Button, Table, TableBody, TableCell, TableHead, TableRow, FormControl, FormLabel, RadioGroup, FormControlLabel, Radio } from '@mui/material';

// Define custom icons
const redIcon = new L.Icon({
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
  className: 'red-marker'
});

const greenIcon = new L.Icon({
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
  className: 'green-marker'
});

function DistrictFinder() {
  const [gameState, setGameState] = useState('setup'); // setup, playing, finished
  const [targetDistrict, setTargetDistrict] = useState(null);
  const [playerGuess, setPlayerGuess] = useState(null);
  const [showResult, setShowResult] = useState(false);
  const [score, setScore] = useState(0);
  const [round, setRound] = useState(0);
  const [totalRounds] = useState(10);
  const [timeRemaining, setTimeRemaining] = useState(30);
  const [leaderboard, setLeaderboard] = useState([]);
  const [playerName, setPlayerName] = useState('');
  const [difficulty, setDifficulty] = useState('easy'); // easy, hard
  const timerRef = useRef(null);

  useEffect(() => {
    const savedLeaderboard = localStorage.getItem('districtFinderLeaderboard');
    if (savedLeaderboard) {
      setLeaderboard(JSON.parse(savedLeaderboard));
    }
  }, []);

  const calculateDistance = useCallback((lat1, lon1, lat2, lon2) => {
    const R = 6371;
    const dLat = deg2rad(lat2 - lat1);
    const dLon = deg2rad(lon2 - lon1);
    const a = 
      Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(deg2rad(lat1)) * Math.cos(deg2rad(lat2)) * 
      Math.sin(dLon/2) * Math.sin(dLon/2); 
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a)); 
    const d = R * c;
    return d;
  }, []);

  const deg2rad = (deg) => {
    return deg * (Math.PI/180);
  };

  // Function to select a random district - defined first to break circular dependency
  const selectRandomDistrict = useCallback(() => {
    const randomIndex = Math.floor(Math.random() * districtsData.features.length);
    const district = districtsData.features[randomIndex];
    setTargetDistrict(district);
    setPlayerGuess(null);
    setShowResult(false);
    setTimeRemaining(30);
  }, []);

  // Define startTimer with selectRandomDistrict in its closure but not in dependencies
  const startTimer = useCallback(() => {
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = setInterval(() => {
      setTimeRemaining(prev => {
        if (prev <= 1) {
          // Use a function reference instead of calling checkAnswer directly
          if (timerRef.current) clearInterval(timerRef.current);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  }, []);

  // Create a ref to store the current selectRandomDistrict function
  const selectRandomDistrictRef = useRef(selectRandomDistrict);
  
  // Keep the ref updated with the latest selectRandomDistrict function
  useEffect(() => {
    selectRandomDistrictRef.current = selectRandomDistrict;
  }, [selectRandomDistrict]);

  const checkAnswer = useCallback(() => {
    if (timerRef.current) clearInterval(timerRef.current);
    if (playerGuess && targetDistrict) {
      const distance = calculateDistance(
        targetDistrict.geometry.coordinates[0][0][1], targetDistrict.geometry.coordinates[0][0][0],
        playerGuess.lat, playerGuess.lng
      );
      const distancePoints = Math.max(100 - Math.floor(distance * 10), 0);
      const timePoints = timeRemaining * 2;
      const roundScore = distancePoints + timePoints;
      setScore(prev => prev + roundScore);
      setShowResult(true);

      setTimeout(() => {
        if (round < totalRounds) {
          setRound(prev => prev + 1);
          // Use the ref to get the latest selectRandomDistrict function
          selectRandomDistrictRef.current();
          startTimer();
        } else {
          endGame();
        }
      }, 3000);
    }
  }, [playerGuess, targetDistrict, timeRemaining, round, totalRounds, calculateDistance, startTimer]);

  // Update the timer effect to include checkAnswer as a dependency
  useEffect(() => {
    if (gameState === 'playing') {
      startTimer();
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [gameState, startTimer]);

  // Add an effect to check the answer when time is up
  useEffect(() => {
    if (timeRemaining === 0 && gameState === 'playing') {
      checkAnswer();
    }
  }, [timeRemaining, gameState, checkAnswer]);

  const startGame = () => {
    setGameState('playing');
    setRound(1);
    setScore(0);
    selectRandomDistrict();
    startTimer();
  };

  const endGame = () => {
    setGameState('finished');
  };

  const submitScore = () => {
    if (!playerName.trim()) {
      alert('Please enter your name');
      return;
    }
    
    const newScore = { name: playerName, score, date: new Date().toISOString() };
    const updatedLeaderboard = [...leaderboard, newScore]
      .sort((a, b) => b.score - a.score)
      .slice(0, 10);
    
    setLeaderboard(updatedLeaderboard);
    localStorage.setItem('districtFinderLeaderboard', JSON.stringify(updatedLeaderboard));
    setGameState('setup');
    setPlayerName('');
  };

  const MapEventHandler = () => {
    useMapEvents({
      click: (e) => {
        if (gameState === 'playing' && !showResult) {
          setPlayerGuess(e.latlng);
        }
      }
    });
    return null;
  };

  return (
    <div className="district-finder">
      <h1>District Finder Game</h1>
      <div className="game-layout">
        <div className="game-controls">
          {gameState === 'setup' && (
            <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
              <Typography variant="h4">Game Setup</Typography>
              <FormControl component="fieldset">
                <FormLabel component="legend">Difficulty</FormLabel>
                <RadioGroup
                  aria-label="difficulty"
                  name="difficulty"
                  value={difficulty}
                  onChange={(e) => setDifficulty(e.target.value)}
                >
                  <FormControlLabel value="easy" control={<Radio />} label="Easy (Street names visible)" />
                  <FormControlLabel value="hard" control={<Radio />} label="Hard (No street names)" />
                </RadioGroup>
              </FormControl>
              <Button variant="contained" color="primary" onClick={startGame}>
                Start Game
              </Button>
            </Box>
          )}
          {gameState === 'playing' && (
            <div className="game-panel">
              <div className="game-info">
                <h2>Find this district: <span className="target-district">{targetDistrict?.properties.Nimi_FIN}</span></h2>
                <div className="round-info">
                  <span>Round: {round}/{totalRounds}</span>
                  <span>Score: {score}</span>
                  <span>Time: {timeRemaining}s</span>
                </div>
                <Button variant="contained" color="primary" onClick={checkAnswer}>Submit Guess</Button>
              </div>
            </div>
          )}
          {gameState === 'finished' && (
            <div className="game-over-panel">
              <h2>Game Over!</h2>
              <p>Your final score: {score}</p>
              <div className="name-input">
                <label>
                  Enter your name for the leaderboard:
                  <input 
                    type="text" 
                    value={playerName} 
                    onChange={(e) => setPlayerName(e.target.value)} 
                    maxLength={15}
                  />
                </label>
                <Button variant="contained" color="primary" onClick={submitScore}>Submit Score</Button>
              </div>
            </div>
          )}
          <Box sx={{ width: '80%', mt: 4 }}>
            <Typography variant="h6">Leaderboard</Typography>
            {leaderboard.length > 0 ? (
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>Rank</TableCell>
                    <TableCell>Name</TableCell>
                    <TableCell>Score</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {leaderboard.map((entry, index) => (
                    <TableRow key={index}>
                      <TableCell>{index + 1}</TableCell>
                      <TableCell>{entry.name}</TableCell>
                      <TableCell>{entry.score}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <Typography>No scores yet. Be the first!</Typography>
            )}
          </Box>
        </div>
        <div className="map-container">
          <MapContainer 
            center={[60.440658867973895, 22.32014364017763]} // Coordinates for Jaanin Paloasema, Turku, Finland
            zoom={13} 
            style={{ height: '600px', width: '100%' }}
            className={difficulty === 'hard' ? 'no-street-names' : ''}
          >
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
              url={`https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png`}
            />
            <MapEventHandler />
            <Marker position={[60.440658867973895, 22.32014364017763]} icon={redIcon}>
              <Popup>Jaanin Paloasema</Popup>
            </Marker>
            {playerGuess && (
              <Marker position={playerGuess}>
                <Popup>Your guess</Popup>
              </Marker>
            )}
            {showResult && targetDistrict && (
              <>
                <Marker 
                  position={[targetDistrict.geometry.coordinates[0][0][1], targetDistrict.geometry.coordinates[0][0][0]]} 
                  icon={greenIcon}
                >
                  <Popup>Correct location: {targetDistrict.properties.Nimi_FIN}</Popup>
                </Marker>
                <Polygon
                  positions={targetDistrict.geometry.coordinates[0].map(coord => [coord[1], coord[0]])}
                  pathOptions={{ color: 'blue', fillColor: 'blue', fillOpacity: 0.2 }}
                />
              </>
            )}
          </MapContainer>
        </div>
      </div>
    </div>
  );
}

export default DistrictFinder;