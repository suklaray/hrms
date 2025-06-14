//hr
import db from '/lib/db';

export default async function handler(req, res) {
    if (req.method === 'POST') {
        const { id, status } = req.body;

        try {
            // Update the leave request status
            const result = await db.query(
                'UPDATE leave_requests SET status = ? WHERE id = ?',
                [status, id]
            );

            if (result.affectedRows === 0) {
                return res.status(404).json({ error: 'Leave request not found' });
            }

            res.status(200).json({ message: `Leave request ${status}` });
        } catch (error) {
            console.error('Error updating leave request status:', error);
            res.status(500).json({ error: 'Failed to update leave request status' });
        }
    } else {
        res.status(405).json({ error: 'Method Not Allowed' });
    }
}
