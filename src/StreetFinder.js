import React, { useState, useEffect, useRef } from 'react';
import { MapContainer, TileLayer, useMapEvents, Circle, Marker, Popup } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import './StreetFinder.css';

// Fix for default marker icons in Leaflet with React
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

// Main game component
function StreetFinder() {
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
  const [selectedCenter, setSelectedCenter] = useState(null);
  const [selectedRadius, setSelectedRadius] = useState(1000); // Default 1km radius in meters
  // Removed unused circleArea state
  const [targetStreet, setTargetStreet] = useState(null);
  const [playerGuess, setPlayerGuess] = useState(null);
  const [streetList, setStreetList] = useState([]);
  const [showResult, setShowResult] = useState(false);
  
  // Timer reference
  const timerRef = useRef(null);

  // Initialize leaderboard from localStorage
  useEffect(() => {
    const savedLeaderboard = localStorage.getItem('streetFinderLeaderboard');
    if (savedLeaderboard) {
      setLeaderboard(JSON.parse(savedLeaderboard));
    }
  }, []);

  // Handle map interactions
  const MapEventHandler = () => {
    useMapEvents({
      click: (e) => {
        if (gameState === 'setup') {
          // In setup mode, click sets the center of the search area
          setSelectedCenter(e.latlng);
          
          // Create a circle with the selected center and radius
          // We don't need to store the circle object since we use react-leaflet's Circle component
          
          // Fetch streets within the circular area
          fetchStreetsInCircle(e.latlng, selectedRadius);
        } else if (gameState === 'playing' && !showResult) {
          // In playing mode, click is the player's guess
          setPlayerGuess(e.latlng);
        }
      }
    });
    
    return null;
  };

  // Fetch streets within a circular area using Overpass API
  const fetchStreetsInCircle = async (center, radius) => {
    try {
      // Convert radius from meters to degrees (approximate)
      // 1 degree of latitude is approximately 111,000 meters
      // Removed unused radiusDegrees variable
      
      const query = `
        [out:json];
        way["highway"]["name"](around:${radius},${center.lat},${center.lng});
        out body;
        >;
        out skel qt;
      `;
      
      const response = await fetch('https://overpass-api.de/api/interpreter', {
        method: 'POST',
        body: query
      });
      
      const data = await response.json();
      
      // Process the streets
      const streets = processStreets(data);
      setStreetList(streets);
      
      if (streets.length >= totalRounds) {
        // Ready to start game
        alert(`Found ${streets.length} streets in this area. Ready to start!`);
      } else {
        alert(`Only found ${streets.length} streets. Please select a larger area or increase the radius.`);
        // Don't reset the center, just let the user adjust the radius
      }
    } catch (error) {
      console.error('Error fetching streets:', error);
      alert('Error fetching streets. Please try again.');
      setSelectedCenter(null);
    }
  };

  // Process the street data from Overpass API
  const processStreets = (data) => {
    const ways = data.elements.filter(el => el.type === 'way' && el.tags && el.tags.name);
    const uniqueStreets = Array.from(new Set(ways.map(way => way.tags.name)));
    
    return uniqueStreets.map(street => {
      // Find a way with this street name to get coordinates
      const way = ways.find(w => w.tags.name === street);
      const nodes = way.nodes;
      
      // Get the middle node for a representative point
      const middleNodeId = nodes[Math.floor(nodes.length / 2)];
      const middleNode = data.elements.find(el => el.type === 'node' && el.id === middleNodeId);
      
      return {
        name: street,
        lat: middleNode ? middleNode.lat : null,
        lon: middleNode ? middleNode.lon : null
      };
    }).filter(street => street.lat !== null && street.lon !== null);
  };

  // Start a new game
  const startGame = () => {
    if (!selectedCenter || streetList.length < totalRounds) {
      alert('Please select an area with enough streets first.');
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
    
    // Remove used street from list to avoid repetition
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
      
      // Calculate points based on distance and time
      const distancePoints = Math.max(100 - Math.floor(distance * 10), 0);
      const timePoints = timeRemaining * 2;
      const roundScore = distancePoints + timePoints;
      
      setScore(prev => prev + roundScore);
      setShowResult(true);
      
      // Show result for 3 seconds then move to next round
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

  // Calculate distance between two points in kilometers
  const calculateDistance = (lat1, lon1, lat2, lon2) => {
    const R = 6371; // Radius of the earth in km
    const dLat = deg2rad(lat2 - lat1);
    const dLon = deg2rad(lon2 - lon1);
    const a = 
      Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(deg2rad(lat1)) * Math.cos(deg2rad(lat2)) * 
      Math.sin(dLon/2) * Math.sin(dLon/2); 
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a)); 
    const d = R * c; // Distance in km
    return d;
  };

  const deg2rad = (deg) => {
    return deg * (Math.PI/180);
  };

  // End the game and update leaderboard
  const endGame = () => {
    setGameState('finished');
  };

  // Submit score to leaderboard
  const submitScore = () => {
    if (!playerName.trim()) {
      alert('Please enter your name');
      return;
    }
    
    const newScore = { name: playerName, score, date: new Date().toISOString() };
    const updatedLeaderboard = [...leaderboard, newScore]
      .sort((a, b) => b.score - a.score)
      .slice(0, 10); // Keep only top 10
    
    setLeaderboard(updatedLeaderboard);
    localStorage.setItem('streetFinderLeaderboard', JSON.stringify(updatedLeaderboard));
    
    // Reset for new game
    setGameState('setup');
    setPlayerName('');
  };

  return (
    <div className="street-finder">
      <h1>Street Finder Game</h1>
      
      <div className="game-layout">
        <div className="game-controls">
          {gameState === 'setup' && (
            <div className="setup-panel">
              <h2>Game Setup</h2>
              
              <div className="difficulty-selector">
                <h3>Difficulty</h3>
                <div className="radio-group">
                  <label>
                    <input 
                      type="radio" 
                      name="difficulty" 
                      value="easy" 
                      checked={difficulty === 'easy'} 
                      onChange={() => setDifficulty('easy')} 
                    />
                    Easy (Street names visible)
                  </label>
                  <label>
                    <input 
                      type="radio" 
                      name="difficulty" 
                      value="hard" 
                      checked={difficulty === 'hard'} 
                      onChange={() => setDifficulty('hard')} 
                    />
                    Hard (No street names)
                  </label>
                </div>
              </div>
              
              <div className="area-selector">
                <h3>Select Play Area</h3>
                <p>Click on the map to set the center of your play area</p>
                
                <div className="radius-selector">
                  <label htmlFor="radius-slider">Radius: {(selectedRadius / 1000).toFixed(1)} km</label>
                  <input
                    id="radius-slider"
                    type="range"
                    min="500"
                    max="5000"
                    step="100"
                    value={selectedRadius}
                    onChange={(e) => {
                      const newRadius = parseInt(e.target.value);
                      setSelectedRadius(newRadius);
                      
                      // Update circle if center is already selected
                      if (selectedCenter) {
                        // We don't need to create a Leaflet circle here as it's managed by the Circle component
                        
                        // Refetch streets with new radius
                        fetchStreetsInCircle(selectedCenter, newRadius);
                      }
                    }}
                  />
                </div>
                
                {selectedCenter && <button onClick={startGame}>Start Game</button>}
              </div>
              
              <div className="leaderboard">
                <h3>Leaderboard</h3>
                {leaderboard.length > 0 ? (
                  <table>
                    <thead>
                      <tr>
                        <th>Rank</th>
                        <th>Name</th>
                        <th>Score</th>
                      </tr>
                    </thead>
                    <tbody>
                      {leaderboard.map((entry, index) => (
                        <tr key={index}>
                          <td>{index + 1}</td>
                          <td>{entry.name}</td>
                          <td>{entry.score}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                ) : (
                  <p>No scores yet. Be the first!</p>
                )}
              </div>
            </div>
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
                <button onClick={checkAnswer}>Submit Guess</button>
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
                <button onClick={submitScore}>Submit Score</button>
              </div>
            </div>
          )}
        </div>
        
        <div className="map-container">
          <MapContainer 
            center={[51.505, -0.09]} 
            zoom={13} 
            style={{ height: '600px', width: '100%' }}
          >
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
              url={`https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png`}
              // If hard mode, use a different tile layer without street names
              // Hard mode will use a different tile URL
              className={difficulty === 'hard' ? 'no-street-names' : ''}
            />
            
            <MapEventHandler />
            
            {/* Show the selected circular area */}
            {selectedCenter && (
              <Circle 
                center={selectedCenter} 
                radius={selectedRadius} 
                pathOptions={{ color: 'green', weight: 2 }} 
              />
            )}
            
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

export default StreetFinder;