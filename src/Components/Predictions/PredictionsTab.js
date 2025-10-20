import React from 'react';
import { Paper, Typography, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, CircularProgress, Box } from '@material-ui/core';
import './PredictionsTab.css';

function PredictionsTab({ predictions, loading }) {
    if (loading) {
        return (
            <Box display="flex" justifyContent="center" alignItems="center" minHeight="300px">
                <CircularProgress />
                <Typography variant="h6" style={{ marginLeft: '16px' }}>
                    Loading Predictions...
                </Typography>
            </Box>
        );
    }

    if (!predictions || predictions.length === 0) {
        return (
            <Box display="flex" justifyContent="center" alignItems="center" minHeight="300px">
                <Typography variant="h6" color="textSecondary">
                    No predictions to display.
                </Typography>
            </Box>
        );
    }

    return (
        <div className="predictions-container">
            <Typography variant="h5" gutterBottom>
                Student Success Predictions
            </Typography>
            <TableContainer component={Paper} style={{maxHeight: '600px', overflow: 'auto'}}>
                <Table stickyHeader>
                    <TableHead>
                        <TableRow>
                            <TableCell>Response ID</TableCell>
                            <TableCell>User ID</TableCell>
                            <TableCell>Predicted Outcome</TableCell>
                            <TableCell>Confidence</TableCell>
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {predictions.map((p) => (
                            <TableRow key={p.responseId} className={p.prediction === 'Pass' ? 'prediction-pass' : 'prediction-fail'}>
                                <TableCell component="th" scope="row">
                                    {p.responseId}
                                </TableCell>
                                <TableCell>{p.userId || 'N/A'}</TableCell>
                                <TableCell>
                                    <Typography variant="body1" style={{ fontWeight: 'bold' }}>
                                        {p.prediction}
                                    </Typography>
                                </TableCell>
                                <TableCell>{p.confidence}</TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </TableContainer>
        </div>
    );
}

export default PredictionsTab;