# Data Engine: No-Approval v1

This branch removes access queues from the next-generation live product path. It does not rewrite or relabel the frozen historical/model evidence that used GloFAS. Those artifacts remain historical evidence and keep their original source labels.

The new human-facing endpoint is `GET /api/v1/my-tomorrow`. It uses Open-Meteo's public Forecast API as the required source and Open-Meteo's ECMWF IFS endpoint as an optional detail source. The implementation requires no API key and no manual source approval. If the optional ECMWF-detail call fails, the endpoint still returns the core forecast rather than taking the product offline.

The first engine covers four signals: flood conditions, heat, severe-storm conditions and short-horizon dry stress. The response is deliberately human-facing: what is coming, when, how serious, what it could affect and what to do. It does not invent monetary loss estimates. Money-at-risk will only be added when a user, business or institutional exposure profile gives the engine real asset or price inputs.

Flood limitations are explicit. This engine uses forecast rainfall, recent rainfall, wetness and ECMWF surface-runoff signals. It is immediately usable for the product proof, but it is not presented as a gauge-based river-discharge model and is not a drop-in scientific replacement inside the frozen GloFAS-trained Riverine Watch v1 model. A later river module must be validated on its own evidence before it can make stronger river-specific claims.

Initial proof locations are Lokoja, Makurdi, Onitsha, Yenagoa and Hadejia. The success test is simple: every location must return a live answer without credentials or an approval queue, and the answer must remain useful on both dangerous and normal days.
