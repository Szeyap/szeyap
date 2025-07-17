# Szeyap App
Szeyap app is a ... [include description here]

## Developing locally

### Setup environment
1. Prerequisite: `uv` is installed
2. Create and activate the virtual environment: `bash setup.sh`
3. Start the server: `uv run src/szeyapapi/api.py`
4. Access Swagger UI at `http://localhost:8000/api/ui`

## Steps to run
Each service exists as a separate Docker container, so you can run each separately or run using `docker compose` which will *glue* all the containers together and allow your client to communicate with your api, for example.

#### [DEV] Running from top level (all containers)
```
docker compose -f docker-compose.dev.yml build
docker compose -f docker-compose.dev.yml up
```

#### [PROD] Running from top level (all containers)
```
docker compose -f docker-compose.yml build
docker compose -f docker-compose.yml up
```

#### Running Profiles
You may not want to run everything, ie if you are developing the discord bot you may not need to start the web container. You can launch with different profile configurations by passing in the --profile configuration. Profile names can be found in `docker-compose.yml`. As an example ...
```
docker compose --profile with-web-client up
```

## v0.0.1 Initial release TODO
### API
- [ ] Improve order of results returned in api, sorted by relevance
- [x] Automatic language detection
- [ ] User account creation
- [ ] Penyim conversion

### Bot
- [ ] Help pages
- [ ] User account creation
- [ ] Penyim conversion

## v0.0.2 Web + Features release TODO
### Web
- [ ] Create search page, where users can search the dictionary
- [ ] Add admin page, allowing editing of dictionaries + jyutping conversion table

### Bot
- [ ] Server stats
  - Use all member join date data to construct graph of historical server membership trend
  - Start tracking server membership, push data to API onMemberJoin
- [ ] Canto Rocks knock-off practice game
- [ ] Stroke order command

### API
- [ ] Server stats, store info in a csv file from now on

### R&D
- [ ] Calculate relevance of definition to query using GLoVE or Word2Vec, and maybe chinese equivalents?
  - Hopefully allow for capturing of semantic meaning instead of merely matching words
  - Need to clean out weird unicode data like the ref numbers, etc.
  - Could also try using a transformer model maybe? Would definitely need to source more data though ...
