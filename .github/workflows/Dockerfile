ARG image
FROM $image
RUN echo -e "security {\n\tenable-quotas true\n}\n" >> /etc/aerospike/aerospike.template.conf
# security.smd was generated manually by
# 1. Starting a new Aerospike EE server using Docker
# 2. Creating the superuser user
# 3. Copying /opt/aerospike/smd/security.smd from the container and committing it to this repo
# This file should always work
# TODO: generate this automatically, somehow
COPY security.smd /opt/aerospike/smd/
