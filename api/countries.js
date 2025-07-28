export default async function handler(req, res) {
    try {
        const apiURL = 'https://bin-db.vercel.app/api/country?list=true';
        const apiRes = await fetch(apiURL);
        const data = await apiRes.json();
        res.json(data);
    } catch (err) {
        res.status(500).json({ error: 'Failed to fetch countries' });
    }
}
