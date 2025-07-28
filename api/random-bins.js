export default async function handler(req, res) {
    const { limit, country } = req.query;
    let apiURL = `https://bin-db.vercel.app/api/random-bins?limit=${limit || 10}`;
    if (country) {
        apiURL += `&country=${country}`;
    }

    try {
        const apiRes = await fetch(apiURL);
        const data = await apiRes.text();
        res.send(data);
    } catch (err) {
        res.status(500).json({ error: 'Failed to fetch random BINs' });
    }
}
