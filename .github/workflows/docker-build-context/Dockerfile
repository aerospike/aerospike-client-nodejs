ARG server_image=aerospike/aerospike-server-enterprise
ARG ROSTER_FILE_NAME=roster.smd
# Temp file for passing node id from one build stage to another
# Docker doesn't support command substitution for setting values for ARG variables, so we have to do this
ARG NODE_ID_FILE_NAME=node_id

FROM $server_image as configure-server

WORKDIR /opt/aerospike/smd

# Enable authentication

ARG AEROSPIKE_CONF_TEMPLATE_PATH=/etc/aerospike/aerospike.template.conf

# Not using asconfig to edit config because we are working with a template file, which may not have valid values yet
RUN echo -e "security {\n\tenable-quotas true\n}\n" >> $AEROSPIKE_CONF_TEMPLATE_PATH
# security.smd was generated manually by
# 1. Starting a new Aerospike EE server using Docker
# 2. Creating the superuser user
# 3. Copying /opt/aerospike/smd/security.smd from the container and committing it to this repo
# This file should always work
# TODO: generate this automatically, somehow.
COPY security.smd .

# Enable strong consistency
RUN sed -i "s/\(namespace.*{\)/\1\n\tstrong-consistency true/" $AEROSPIKE_CONF_TEMPLATE_PATH
RUN sed -i "s/\(namespace.*{\)/\1\n\tstrong-consistency-allow-expunge true/" $AEROSPIKE_CONF_TEMPLATE_PATH
RUN sed -i "s/\(namespace.*{\)/\1\n\tdefault-ttl 2592000/" $AEROSPIKE_CONF_TEMPLATE_PATH
ARG ROSTER_FILE_NAME
COPY $ROSTER_FILE_NAME .

# Fetch node id from roster.smd

# There's no tag for the latest major version to prevent breaking changes in jq
# This is the next best thing
FROM ghcr.io/jqlang/jq:1.7 as get-jq
# jq docker image doesn't have a shell
# We need a shell to fetch and pass the node id to the next build stage
FROM busybox as get-node-id
COPY --from=get-jq /jq /bin/
ARG ROSTER_FILE_NAME
COPY $ROSTER_FILE_NAME .
ARG NODE_ID_FILE_NAME
RUN jq --raw-output '.[1].value' $ROSTER_FILE_NAME > $NODE_ID_FILE_NAME

FROM configure-server as set-node-id
ARG NODE_ID_FILE_NAME
COPY --from=get-node-id $NODE_ID_FILE_NAME .
RUN sed -i "s/\(^service {\)/\1\n\tnode-id $(cat $NODE_ID_FILE_NAME)/" $AEROSPIKE_CONF_TEMPLATE_PATH
RUN rm $NODE_ID_FILE_NAME