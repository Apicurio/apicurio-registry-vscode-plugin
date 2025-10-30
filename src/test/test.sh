#!/usr/bin/env bash

# Create Group
curl -X POST "http://localhost:8080/apis/registry/v3/groups" \
  -H "Content-Type: application/json" \
  -d '{
  "groupId": "test",
  "description": "A test group.",
  "labels": {
    "custom-1": "foo",
    "custom-2": "bar"
  }
}'

# # Create artifact
# curl -X POST "http://localhost:8080/apis/registry/v3/groups/test/artifacts" \
#   -H "Content-Type: application/json" \
#   -d '{
#     "artifactId":"demo-user-schema",
#     "artifactType":"JSON",
#     "name":"User Schema",
#     "description":"A Sample User Schema",
#     "labels":{
#         "custom-1": "foo",
#         "custom-2": "bar"
#         }
#     }'
# Create artifact
curl -X POST "http://localhost:8080/apis/registry/v3/groups/test/artifacts?ifExists=CREATE_VERSION" \
  -H "Content-Type: application/json" \
  -d '{
    "artifactId":"demo-user-schema",
    "artifactType":"JSON",
    "name":"User Schema",
    "description":"",
    "labels":{},
    "firstVersion":{
        "version": "1.0.0",
        "content": {
            "content": "{\"$schema\":\"https://json-schema.org/draft/2020-12/schema\",\"title\":\"User\",\"type\":\"object\",\"properties\":{\"id\":{\"type\":\"string\"},\"name\":{\"type\":\"string\"},\"email\":{\"type\":\"string\",\"format\":\"email\"}},\"required\":[\"id\",\"name\",\"email\"]}",
            "contentType": "application/json"
        },
        "name": "User Schema 1.0.0",
        "description": "Initial version of the user schema",
        "Branches":"v1",
        "isDraft": false
        }
    }'

# Create Artifact Version.
curl -X POST "http://localhost:8080/apis/registry/v3/groups/test/artifacts/demo-user-schema/versions" \
  -H "Content-Type: application/json" \
  -d '{
        "artifactType": "JSON",
        "version": "1.0.0",
        "content": {
            "content": "{\"$schema\":\"https://json-schema.org/draft/2020-12/schema\",\"title\":\"User\",\"type\":\"object\",\"properties\":{\"id\":{\"type\":\"string\"},\"name\":{\"type\":\"string\"},\"email\":{\"type\":\"string\",\"format\":\"email\"}},\"required\":[\"id\",\"name\",\"email\"]}",
            "contentType": "application/json"
        },
        "name": "User Schema 1.0.0",
        "description": "Initial version of the user schema",
        "isDraft": false
    }'


curl -X POST "http://localhost:8080/apis/registry/v3/groups/test/artifacts?ifExists=CREATE_VERSION" \
  -H "Content-Type: application/json" \
  -d '{
    "artifactId":"demo-openapi",
    "artifactType":"OPENAPI",
    "name":"User Schema",
    "description":"",
    "labels":{},
    "firstVersion":{
        "version": "1.0.0",
        "content": {
            "content": "{\"openapi\":\"3.0.0\",\"info\":{\"title\":\"User API\",\"version\":\"1.0.0\"},\"paths\":{\"/users/{userId}\":{\"get\":{\"summary\":\"Get user by ID\",\"parameters\":[{\"name\":\"userId\",\"in\":\"path\",\"required\":true,\"schema\":{\"type\":\"string\"}}],\"responses\":{\"200\":{\"description\":\"OK\",\"content\":{\"application/json\":{\"schema\":{\"$ref\":\"urn:apicurio:registry:test:demo-user-schema:1\"}}}}}}}}}",
            "contentType": "application/json"
        },
        "name": "User Schema 1.0.0",
        "description": "Initial OpenAPI specification referencing demo-user-schema",
        "Branches":"v1",
        "isDraft": false
        }
    }'

# Create Artifact Version.
curl -X POST "http://localhost:8080/apis/registry/v3/groups/test/artifacts/demo-openapi/versions" \
  -H "Content-Type: application/json" \
  -d '{
    "artifactType": "OPENAPI",
      "version": "1.0.5",
      "content": {
        "content": "{\"openapi\":\"3.0.0\",\"info\":{\"title\":\"User API\",\"version\":\"1.0.2\"},\"paths\":{\"/users/{userId}\":{\"get\":{\"summary\":\"Get user by ID\",\"parameters\":[{\"name\":\"userId\",\"in\":\"path\",\"required\":true,\"schema\":{\"type\":\"string\"}}],\"responses\":{\"200\":{\"description\":\"OK\",\"content\":{\"application/json\":{\"schema\":{\"$ref\":\"urn:apicurio:registry:test:demo-user-schema:1\"}}}}}}}}}",
        "contentType": "application/json",
        "references": [
            {
            "groupId": "test",
            "artifactId": "demo-user-schema",
            "version": "1.0.0",
            "name": "urn:apicurio:registry:test:demo-user-schema:1"
            }
        ]
      },
      "name": "User API 1.0.1",
      "description": "Initial OpenAPI specification referencing demo-user-schema",
      "isDraft": true
  }'




# -----
# From Apicurio doc :
# https://www.apicur.io/registry/docs/apicurio-registry/3.1.x/getting-started/assembly-managing-registry-artifacts-api.html#managing-artifact-references-using-rest-api_registry
# Functional for AVRO.
# @TODO, make it work for OPENAPI & JSON.

curl -X POST http://localhost:8080/apis/registry/v3/groups/my-group/artifacts \
   -H "Content-Type: application/json" \
   --data '{"artifactId":"ItemId","artifactType":"AVRO","firstVersion":{"version":"1.0.0","content":{"content":"{\"namespace\":\"com.example.common\",\"name\":\"ItemId\",\"type\":\"record\",\"fields\":[{\"name\":\"id\",\"type\":\"int\"}]}","contentType":"application/json"}}}'

curl -X POST http://localhost:8080/apis/registry/v3/groups/my-group/artifacts \
-H 'Content-Type: application/json' \
--data-raw '{
	"artifactId": "Item",
	"artifactType": "AVRO",
	"firstVersion": {
		"version": "1.0.0",
		"content": {
			"content": "{\"namespace\":\"com.example.common\",\"name\":\"Item\",\"type\":\"record\",\"fields\":[{\"name\":\"itemId\",\"type\":\"com.example.common.ItemId\"}]}",
			"contentType": "application/json",
			"references": [
				{
					"name": "com.example.common.ItemId",
					"groupId": "my-group",
					"artifactId": "ItemId",
					"version": "1.0.0"
				}
			]
		}
	}
}'
