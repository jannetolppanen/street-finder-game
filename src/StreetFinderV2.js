// Streets v2 placeholder page with hello world
import React, { useState, useEffect, useRef } from 'react';
import { MapContainer, TileLayer, useMapEvents, Circle, Marker, Popup, Polygon } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import './StreetFinder.css';
import GameSetup from './components/GameSetup';
import Leaderboard from './components/Leaderboard';
import districtsData from './data/turku_districts_all.json';
import { Box, Typography, Button } from '@mui/material';

// Fix for default marker icons in Leaflet with React
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

function StreetFinderV2() {
  // Game states
  const [gameState, setGameState] = useState('setup'); // setup, playing, finished
  const [difficulty, setDifficulty] = useState('easy'); // easy, hard (street names visible or not)
  const [score, setScore] = useState(0);
  const [round, setRound] = useState(0);
  const [totalRounds] = useState(10);
  const [timeRemaining, setTimeRemaining] = useState(30);
  const [leaderboard, setLeaderboard] = useState([]);
  const [playerName, setPlayerName] = useState('');
  
  // Map states
  const [selectedDistricts, setSelectedDistricts] = useState([]);
  const [targetStreet, setTargetStreet] = useState(null);
  const [playerGuess, setPlayerGuess] = useState(null);
  const [streetList, setStreetList] = useState([]);
  const [showResult, setShowResult] = useState(false);
  
  // Timer reference
  const timerRef = useRef(null);

  // Initialize leaderboard from localStorage
  useEffect(() => {
    const savedLeaderboard = localStorage.getItem('streetFinderV2Leaderboard');
    if (savedLeaderboard) {
      setLeaderboard(JSON.parse(savedLeaderboard));
    }
  }, []);

  // Handle map interactions
  const MapEventHandler = () => {
    useMapEvents({
      click: (e) => {
        if (gameState === 'setup') {
          // Find clicked district
          const clickedPoint = [e.latlng.lng, e.latlng.lat];
          const clickedDistrict = districtsData.features.find(district => {
            return isPointInPolygon(clickedPoint, district.geometry.coordinates[0]);
          });

          if (clickedDistrict) {
            setSelectedDistricts(prev => {
              const districtIndex = prev.findIndex(d => d.properties.Nimi_FIN === clickedDistrict.properties.Nimi_FIN);
              if (districtIndex >= 0) {
                // Remove district if already selected
                return prev.filter((_, index) => index !== districtIndex);
              } else {
                // Add district if not selected
                return [...prev, clickedDistrict];
              }
            });
          }
        } else if (gameState === 'playing' && !showResult) {
          setPlayerGuess(e.latlng);
        }
      }
    });
    return null;
  };

  // Check if a point is inside a polygon
  const isPointInPolygon = (point, polygon) => {
    let inside = false;
    for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
      const xi = polygon[i][0], yi = polygon[i][1];
      const xj = polygon[j][0], yj = polygon[j][1];
      
      const intersect = ((yi > point[1]) !== (yj > point[1])) &&
        (point[0] < (xj - xi) * (point[1] - yi) / (yj - yi) + xi);
      if (intersect) inside = !inside;
    }
    return inside;
  };

  // Fetch streets within selected districts using Overpass API
  const fetchStreetsInDistricts = async () => {
    if (selectedDistricts.length === 0) return;

    try {
      // Create a query that combines all selected districts
      const areas = selectedDistricts.map(district => {
        const bounds = getBoundingBox(district.geometry.coordinates[0]);
        return `way["highway"]["name"](${bounds.south},${bounds.west},${bounds.north},${bounds.east});`;
      }).join('\n');

      const query = `
        [out:json];
        (
          ${areas}
        );
        out body;
        >;
        out skel qt;
      `;
      
      const response = await fetch('https://overpass-api.de/api/interpreter', {
        method: 'POST',
        body: query
      });
      
      const data = await response.json();
      const streets = processStreets(data);
      setStreetList(streets);
    } catch (error) {
      console.error('Error fetching streets:', error);
    }
  };

  // Get bounding box for a polygon
  const getBoundingBox = (coordinates) => {
    const bounds = coordinates.reduce((acc, coord) => ({
      north: Math.max(acc.north, coord[1]),
      south: Math.min(acc.south, coord[1]),
      east: Math.max(acc.east, coord[0]),
      west: Math.min(acc.west, coord[0])
    }), {
      north: -90,
      south: 90,
      east: -180,
      west: 180
    });
    return bounds;
  };

  // Process the street data from Overpass API
  const processStreets = (data) => {
    const ways = data.elements.filter(el => el.type === 'way' && el.tags && el.tags.name);
    const uniqueStreets = Array.from(new Set(ways.map(way => way.tags.name)));
    
    return uniqueStreets.map(street => {
      const way = ways.find(w => w.tags.name === street);
      const nodes = way.nodes;
      const middleNodeId = nodes[Math.floor(nodes.length / 2)];
      const middleNode = data.elements.find(el => el.type === 'node' && el.id === middleNodeId);
      
      return {
        name: street,
        lat: middleNode ? middleNode.lat : null,
        lon: middleNode ? middleNode.lon : null
      };
    }).filter(street => street.lat !== null && street.lon !== null);
  };

  // Calculate distance between two points in kilometers
  const calculateDistance = (lat1, lon1, lat2, lon2) => {
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
  };

  const deg2rad = (deg) => {
    return deg * (Math.PI/180);
  };

  // Start a new game
  const startGame = async () => {
    if (selectedDistricts.length === 0) {
      alert('Please select at least one district first.');
      return;
    }

    await fetchStreetsInDistricts();
    
    if (streetList.length < totalRounds) {
      alert('Not enough streets in selected districts. Please select more districts.');
      return;
    }
    
    setGameState('playing');
    setRound(1);
    setScore(0);
    selectRandomStreet();
    startTimer();
  };

  // Select a random street for the current round
  const selectRandomStreet = () => {
    if (streetList.length === 0) return;
    
    const randomIndex = Math.floor(Math.random() * streetList.length);
    const street = streetList[randomIndex];
    
    setTargetStreet(street);
    setPlayerGuess(null);
    setShowResult(false);
    setTimeRemaining(30);
    setStreetList(prev => prev.filter((_, idx) => idx !== randomIndex));
  };

  // Start timer for the round
  const startTimer = () => {
    if (timerRef.current) clearInterval(timerRef.current);
    
    timerRef.current = setInterval(() => {
      setTimeRemaining(prev => {
        if (prev <= 1) {
          checkAnswer();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  // Check the player's answer
  const checkAnswer = () => {
    if (timerRef.current) clearInterval(timerRef.current);
    
    if (playerGuess && targetStreet) {
      const distance = calculateDistance(
        targetStreet.lat, targetStreet.lon,
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
          selectRandomStreet();
          startTimer();
        } else {
          endGame();
        }
      }, 3000);
    }
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
    localStorage.setItem('streetFinderV2Leaderboard', JSON.stringify(updatedLeaderboard));
    setGameState('setup');
    setPlayerName('');
    setSelectedDistricts([]);
  };

  return (
    <div className="street-finder">
      <h1>Street Finder Game v2</h1>
      
      <div className="game-layout">
        <div className="game-controls">
          {gameState === 'setup' && (
            <>
              <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
                <Typography variant="h4">Game Setup</Typography>
                <Typography variant="body1">
                  Click on districts to select/deselect them. Selected districts will be highlighted on the map.
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Selected districts: {selectedDistricts.map(d => d.properties.Nimi_FIN).join(', ')}
                </Typography>
                <GameSetup
                  difficulty={difficulty}
                  setDifficulty={setDifficulty}
                  selectedRadius={0}
                  setSelectedRadius={() => {}}
                  selectedCenter={null}
                  fetchStreetsInCircle={() => {}}
                  startGame={startGame}
                />
                {selectedDistricts.length > 0 && (
                  <Button variant="contained" color="primary" onClick={startGame} sx={{ mt: 2 }}>
                    Start Game
                  </Button>
                )}
              </Box>
              <Leaderboard leaderboard={leaderboard} />
            </>
          )}
          
          {gameState === 'playing' && (
            <div className="game-panel">
              <div className="game-info">
                <h2>Find this street: <span className="target-street">{targetStreet?.name}</span></h2>
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
        </div>
        
        <div className="map-container" style={{ flex: '1 1 auto', height: 'calc(100vh - 100px)' }}>
          <MapContainer 
            center={[60.4518, 22.2666]} // Coordinates for Turku
            zoom={12} 
            style={{ height: '100%', width: '100%' }}
          >
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
              url={`https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png`}
              className={difficulty === 'hard' ? 'no-street-names' : ''}
            />
            
            <MapEventHandler />
            
            {/* Show selected districts */}
            {selectedDistricts.map((district, index) => (
              <Polygon
                key={index}
                positions={district.geometry.coordinates[0].map(coord => [coord[1], coord[0]])}
                pathOptions={{ 
                  color: 'green',
                  fillColor: 'green',
                  fillOpacity: 0.2,
                  weight: 2
                }}
              />
            ))}
            
            {/* Show player's guess */}
            {playerGuess && (
              <Marker position={playerGuess}>
                <Popup>Your guess</Popup>
              </Marker>
            )}
            
            {/* Show correct location after guess */}
            {showResult && targetStreet && (
              <Marker 
                position={[targetStreet.lat, targetStreet.lon]}
                icon={new L.Icon({
                  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
                  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
                  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
                  iconSize: [25, 41],
                  iconAnchor: [12, 41],
                  popupAnchor: [1, -34],
                  shadowSize: [41, 41]
                })}
              >
                <Popup>Correct location: {targetStreet.name}</Popup>
              </Marker>
            )}
          </MapContainer>
        </div>
      </div>
    </div>
  );
}

export default StreetFinderV2;
