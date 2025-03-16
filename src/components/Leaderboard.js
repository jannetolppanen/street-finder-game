import React from 'react';
import { Box, Typography, Table, TableBody, TableCell, TableHead, TableRow } from '@mui/material';

const Leaderboard = ({ leaderboard }) => {
  return (
    <Box sx={{ width: '100%', mt: 4 }}>
      <Typography variant="h6" gutterBottom>Leaderboard</Typography>
      {leaderboard.length > 0 ? (
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Rank</TableCell>
              <TableCell>Name</TableCell>
              <TableCell>Score</TableCell>
              <TableCell>Date</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {leaderboard.map((entry, index) => (
              <TableRow key={index}>
                <TableCell>{index + 1}</TableCell>
                <TableCell>{entry.name}</TableCell>
                <TableCell>{entry.score}</TableCell>
                <TableCell>{new Date(entry.date).toLocaleDateString()}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      ) : (
        <Typography>No scores yet. Be the first!</Typography>
      )}
    </Box>
  );
};

export default Leaderboard;