### Installation

1. clone project ```git clone git@github.com:STEXS-Technologies/stexs.git```

2. copy .env.example ```cp .env.example .env``` and fill out all fields but not for the storage section

3. run preinstall script ```npm run preinstall```

4. install dependencies ```pnpm i```

5. create docker containers ```docker-compose up -d```

6. run kong setup script ```./docker/kong/setup.sh```

7. migrate the database ```migrate -path apps/db/migrations -database "postgresql://postgres:pwd@host:5432/postgres?sslmode=disable" -verbose up``` (replace `pwd` and `host` from .env file)

8. visit localhost:9001 and create bucket `stexs` and create an access key

9. fill out the storage section with the bucket name and access key parameters in the `.env` file

10. run ```pnpm dev``` or ```stexs-dev```