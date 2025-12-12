


export const getGeography = (req, res, pool) => {

    pool.query(`Select "mentions", "country", "owner_id", "date" from "details"`, (err, result) => {
        if (!err) {
            const params = new URLSearchParams(req.query);
            let rows = result.rows;

            if (params.has('date') && params.get('date')) rows = rows.filter(({date}) => date.split('-')?.[1] === params.get('date'))

            const countries = {}
            rows.forEach((row) => {
                const {mentions, country} = row;
                if (!countries[country]) {
                    countries[country] = {mentions: []}
                }
                mentions?.split(',')?.forEach((mention) => {
                    if (!countries[country].mentions.includes(mention)) {
                        countries[country].mentions.push(mention)
                    }
                })

            })

            const resultCountries = Object.keys(countries).map((country) => {
                return {
                    country,
                    total: countries[country].mentions.length
                }
            })
            res.send(resultCountries);
        }
    });
    pool.end;


}
