# Start from the official PostgreSQL image
FROM postgres:17.2

# Install dependencies
RUN apt-get update && \
    apt-get install -y \
    postgresql-contrib \
    build-essential \
    postgis \
    postgresql-12-postgis-3 \
    git \
    curl \
    unzip \
    && apt-get clean \
    && echo "Dependencies installed."

# Install pgRouting (extension for PostGIS)
RUN curl -sL https://github.com/pgRouting/pgrouting/archive/refs/tags/v3.3.0.tar.gz | tar xz -C /tmp && \
    cd /tmp/pgrouting-3.3.0 && \
    make && make install && \
    rm -rf /tmp/pgrouting-3.3.0 && \
    echo "pgRouting installed."

# Install pgTAP (Unit Testing for PostgreSQL)
RUN git clone https://github.com/pgtap/pgtap.git /tmp/pgtap && \
    cd /tmp/pgtap && \
    make && make install && \
    rm -rf /tmp/pgtap && \
    echo "pgTAP installed."

# Install pg_cron (PostgreSQL cron jobs)
RUN git clone https://github.com/citusdata/pg_cron.git /tmp/pg_cron && \
    cd /tmp/pg_cron && \
    make && make install && \
    rm -rf /tmp/pg_cron && \
    echo "pg_cron installed."

# Install pgAudit (Audit logging)
RUN git clone https://github.com/pgaudit/pgaudit.git /tmp/pgaudit && \
    cd /tmp/pgaudit && \
    make && make install && \
    rm -rf /tmp/pgaudit && \
    echo "pgAudit installed."

# Install other extensions from their repositories
# Example for installing pgjwt
RUN git clone https://github.com/michelp/pgjwt.git /tmp/pgjwt && \
    cd /tmp/pgjwt && \
    make && make install && \
    rm -rf /tmp/pgjwt && \
    echo "pgjwt installed."

# Clean up apt cache to reduce image size
RUN apt-get clean && echo "Clean up complete."

# Expose default PostgreSQL port
EXPOSE 5432
