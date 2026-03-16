# Makefile
.PHONY: build run up stop clean logs start api restart seed demo

# Docker-related variables
DOCKER_COMPOSE = docker compose

# Build the Docker image
build:
	$(DOCKER_COMPOSE) build

# Run the Docker container
run:
	$(DOCKER_COMPOSE) up

# Build and run the Docker container
up:
	$(DOCKER_COMPOSE) up --build -d

# Stop and remove the Docker container
stop:
	$(DOCKER_COMPOSE) down

# Clean up Docker images and volumes
clean:
	$(DOCKER_COMPOSE) down -v

# View the logs
logs:
	$(DOCKER_COMPOSE) logs --tail=100 -f

# Start containers without rebuilding
start:
	$(DOCKER_COMPOSE) up -d

# Build and run only MongoDB and backend (for API testing without frontend)
api:
	$(DOCKER_COMPOSE) up --build -d mongodb backend

# Quick restart
restart: stop up logs

# Run the seed script inside the running backend container
seed:
	$(DOCKER_COMPOSE) exec backend npm run seed

# Bring up MongoDB + backend, then seed demo data
demo: api
	$(DOCKER_COMPOSE) exec backend npm run seed