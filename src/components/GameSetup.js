import React from 'react';
import { Box, Typography, Radio, RadioGroup, FormControl, FormControlLabel, FormLabel, Slider, Button } from '@mui/material';

const GameSetup = ({ difficulty, setDifficulty, selectedRadius, setSelectedRadius, selectedCenter, fetchStreetsInCircle, startGame }) => {
  return (
    <Box className="setup-panel" sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
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
      
      <Box sx={{ width: '80%' }}>
        <Typography id="radius-slider" gutterBottom>
          Radius: {(selectedRadius / 1000).toFixed(1)} km
        </Typography>
        <Slider
          value={selectedRadius}
          min={500}
          max={5000}
          step={100}
          onChange={(e, newValue) => {
            setSelectedRadius(newValue);
            if (selectedCenter) {
              fetchStreetsInCircle(selectedCenter, newValue);
            }
          }}
          valueLabelDisplay="auto"
          aria-labelledby="radius-slider"
        />
      </Box>
      
      {selectedCenter && (
        <Button variant="contained" color="primary" onClick={startGame}>
          Start Game
        </Button>
      )}
    </Box>
  );
};

export default GameSetup;