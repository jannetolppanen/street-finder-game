import React from 'react';
import { Typography, Box } from '@mui/material';

function HomePage() {
  return (
    <Box sx={{ padding: 2 }}>
      <Typography variant="h4" gutterBottom>
        Welcome to the Street Finder Game!
      </Typography>
      <Typography variant="body1">
        Use the navigation bar to start playing the game. Click on "Streets" to find streets or "Districts" to find districts.
      </Typography>
    </Box>
  );
}

export default HomePage;