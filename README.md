### Installation

1. clone project ```git clone git@github.com:STEXS-Technologies/stexs.git```

2. copy .env.example ```cp .env.example .env``` and fill out all fields but not for the storage section

3. install dependencies ```pnpm i```

4. create docker containers ```docker-compose up -d```

5. run kong setup script ```./docker/kong/setup.sh```

6. migrate the database ```migrate -path apps/db/migrations -database "postgresql://postgres:pwd@host:5432/postgres?sslmode=disable" -verbose up``` (replace `pwd` and `host` from .env file)

7. visit localhost:9001 and create bucket `stexs` and create an access key

8. fill out the storage section with the bucket name and access key parameters in the `.env` file

9. run ```pnpm dev```