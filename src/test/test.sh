#!/usr/bin/env bash

##
# TEST GROUP
#

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
        "branches":["1", "1.0", "1.0.0"],
        "isDraft": false
        }
    }'

# Create Artifact Version.
curl -X POST "http://localhost:8080/apis/registry/v3/groups/test/artifacts/demo-user-schema/versions" \
  -H "Content-Type: application/json" \
  -d '{
        "artifactType": "JSON",
        "version": "1.0.1",
        "content": {
            "content": "{\"$schema\":\"https://json-schema.org/draft/2020-12/schema\",\"title\":\"User\",\"type\":\"object\",\"properties\":{\"id\":{\"type\":\"string\"},\"name\":{\"type\":\"string\"},\"email\":{\"type\":\"string\",\"format\":\"email\"}},\"required\":[\"id\",\"name\",\"email\"]}",
            "contentType": "application/json"
        },
        "name": "User Schema 1.0.1",
        "description": "Initial version of the user schema",
        "isDraft": true
    }'

# Update version (if draft & apropriate registry settings.)
curl -v -X PUT "http://localhost:8080/apis/registry/v3/groups/test/artifacts/demo-user-schema/versions/1.0.1/content" \
  -H "Content-Type: application/json" \
  -d '{
        "content": "{\"$schema\":\"https://json-schema.org/draft/2020-12/schema\",\"title\":\"User\",\"type\":\"object\",\"properties\":{\"id\":{\"type\":\"string\"},\"name\":{\"type\":\"string\"},\"email\":{\"type\":\"string\",\"format\":\"email\"}},\"required\":[\"id\",\"name\"]}",
        "contentType": "application/json"
    }' | jq .
# Change State
curl -v -X PUT "http://localhost:8080/apis/registry/v3/groups/test/artifacts/demo-user-schema/versions/1.0.1/state" \
  -H "Content-Type: application/json" \
  -d '{"state": "DRAFT"}' | jq .


##
# CREATE OPENAPI
# @TODO manage references.
#
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
        "branches":["1", "1.0", "1.0.0"],
        "isDraft": false
        }
    }'

##
# Create Artifact Version.
# OPEN API with Reference to JSON Schema.
# @TODO Fix references
#
curl -X POST "http://localhost:8080/apis/registry/v3/groups/test/artifacts/demo-openapi/versions" \
  -H "Content-Type: application/json" \
  -d '{
    "artifactType": "OPENAPI",
      "version": "1.0.1",
      "content": {
        "content": "{\"openapi\":\"3.0.0\",\"info\":{\"title\":\"User API\",\"version\":\"1.0.1\"},\"paths\":{\"/users/{userId}\":{\"get\":{\"summary\":\"Get user by ID\",\"parameters\":[{\"name\":\"userId\",\"in\":\"path\",\"required\":true,\"schema\":{\"type\":\"string\"}}],\"responses\":{\"200\":{\"description\":\"OK\",\"content\":{\"application/json\":{\"schema\":{\"$ref\":\"user\"}}}}}}}}}",
        "contentType": "application/json",
        "references": [
          {
            "name": "user",
            "groupId": "test",
            "artifactId": "demo-user-schema",
            "version": "1.0.0"
          }
        ]
      },
      "name": "User API 1.0.1",
      "description": "Initial OpenAPI specification referencing demo-user-schema",
      "labels": {"custom-1": "foo","custom-2": "bar"},
      "branches":["1", "1.0", "1.0.0"],
      "isDraft": true
  }'




# -----
# From Apicurio doc :
# https://www.apicur.io/registry/docs/apicurio-registry/3.1.x/getting-started/assembly-managing-registry-artifacts-api.html#managing-artifact-references-using-rest-api_registry
# Functional for AVRO.
# @TODO, make it work for OPENAPI & JSON.

##
# Create referenced Artifact
#
curl -X POST http://localhost:8080/apis/registry/v3/groups/demo/artifacts \
   -H "Content-Type: application/json" \
   --data '{"artifactId":"ItemId","artifactType":"AVRO","firstVersion":{"version":"1.0.0","content":{"content":"{\"namespace\":\"com.example.common\",\"name\":\"ItemId\",\"type\":\"record\",\"fields\":[{\"name\":\"id\",\"type\":\"int\"}]}","contentType":"application/json"}}}'

##
# Create Artifact with references
# Avro to Avro reference
#
curl -X POST http://localhost:8080/apis/registry/v3/groups/demo/artifacts \
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
					"groupId": "demo",
					"artifactId": "ItemId",
					"version": "1.0.0"
				}
			]
		}
	}
}'

##
# Create Artifact Version with references
# Avro to Avro reference
#
curl -X POST http://localhost:8080/apis/registry/v3/groups/demo/artifacts/Item/versions \
-H 'Content-Type: application/json' \
--data-raw '{
	"artifactType": "AVRO",
		"version": "1.0.1",
    "labels": {"custom-1": "foo","custom-2": "bar"},
		"content": {
			"content": "{\"namespace\":\"com.example.common\",\"name\":\"Item\",\"type\":\"record\",\"fields\":[{\"name\":\"itemId\",\"type\":\"com.example.common.ItemId\"}]}",
			"contentType": "application/json",
			"references": [
				{
					"name": "com.example.common.ItemId",
					"groupId": "demo",
					"artifactId": "ItemId",
					"version": "1.0.0"
				}
			]
	}
}'

##
# Add comments to an artifact version
#
curl -X POST http://localhost:8080/apis/registry/v3/groups/demo/artifacts/Item/versions/1.0.1/comments \
-H 'Content-Type: application/json' \
--data-raw '{"value": "This is a new comment on an existing artifact version."}'
curl -X POST http://localhost:8080/apis/registry/v3/groups/demo/artifacts/Item/versions/1.0.1/comments \
-H 'Content-Type: application/json' \
--data-raw '{"value": "This is another comment on an existing artifact version."}'


# Prettify request :
# curl -s "http://localhost:8080/apis/registry/v3/groups/demo/artifacts/Item/versions/1.0.1" | jq .


# Add rules to the group
curl -X POST http://localhost:8080/apis/registry/v3/groups/demo/rules \
   -H "Content-Type: application/json" \
   --data '{"ruleType": "VALIDITY","config": "FULL"}'


##
# JSON Schema referencing other schemas
# @TODO Fix Content issue.
#
curl -X POST "http://localhost:8080/apis/registry/v3/groups/default/artifacts?ifExists=CREATE_VERSION" \
  -H "Content-Type: application/json" \
--data-raw  '{
    "artifactId":"demo-user-schema",
    "artifactType":"JSON",
    "name":"User Schema",
    "description":"",
    "labels":{},
    "firstVersion":{
        "version": "1.0.0",
        "content": {
            "content": "{ \"openapi\": \"3.0.1\", \"info\": { \"title\": \"Citizen API\", \"version\": \"1.0.0\", \"description\": \"Simple API that returns a Citizen object.\" }, \"paths\": { \"/citizens/{identifier}\": { \"get\": { \"summary\": \"Get a citizen by identifier\", \"operationId\": \"getCitizenByIdentifier\", \"parameters\": [ { \"name\": \"identifier\", \"in\": \"path\", \"required\": true, \"schema\": { \"type\": \"string\" }, \"description\": \"Unique identifier of the citizen.\" } ], \"responses\": { \"200\": { \"description\": \"Citizen found\", \"content\": { \"application/json\": { \"schema\": { \"$ref\": \"#/components/schemas/Citizen\" } } } }, \"404\": { \"description\": \"Citizen not found\" } } } } }, \"components\": { \"schemas\": { \"Citizen\": { \"title\": \"Citizen\", \"type\": \"object\", \"properties\": { \"firstName\": { \"type\": \"string\", \"description\": \"The citizen's first name.\" }, \"lastName\": { \"type\": \"string\", \"description\": \"The citizen's last name.\" }, \"age\": { \"type\": \"integer\", \"minimum\": 0, \"description\": \"Age in years which must be equal to or greater than zero.\" }, \"city\": { \"$ref\": \"types/all-types.json#/definitions/City/properties/name\" }, \"identifier\": { \"$ref\": \"types/all-types.json#/definitions/Identifier\" } }, \"required\": [ \"city\" ] } } } }",
            "contentType": "application/json",
            "references": [
              {
                "name": "types/all-types.json#/definitions/City/properties/name",
                "artifactId": "all-types",
                "version": "1"
              },
              {
                "name": "types/all-types.json#/definitions/Identifier",
                "artifactId": "all-types",
                "version": "1"
              }
            ]
        },
        "name": "User Schema 1.0.0",
        "description": "Initial version of the user schema",
        "branches":["1", "1.0", "1.0.0"],
        "isDraft": false
        }
    }'

##
# OPENAPI reference to JSON Schema
#
curl -X POST "http://localhost:8080/apis/registry/v3/groups/default/artifacts?ifExists=CREATE_VERSION" \
  -H "Content-Type: application/json" \
--data-raw  '{
    "artifactId":"demo-user-schema",
    "artifactType":"JSON",
    "name":"User Schema",
    "description":"",
    "labels":{},
    "firstVersion":{
        "version": "1.0.0",
        "content": {
            "content": "{}",
            "contentType": "application/json",
            "references": [
              {
                "name": "types/all-types.json#/definitions/City/properties/name",
                "artifactId": "all-types",
                "version": "1"
              },
              {
                "name": "types/all-types.json#/definitions/Identifier",
                "artifactId": "all-types",
                "version": "1"
              }
            ]
        },
        "name": "User Schema 1.0.0",
        "description": "Initial version of the user schema",
        "branches":["1", "1.0", "1.0.0"],
        "isDraft": false
        }
    }'


##
# JSON Schema with definitions for reference
#
curl -X POST 'http://localhost:8080/apis/registry/v3/groups/demo/artifacts' \
-H 'Content-Type: application/json' \
-d '{
  "artifactId": "all-types",
  "artifactType": "JSON",
  "firstVersion": {
    "content": {
      "content": "{\"$id\":\"https://example.com/types/all-types.json\",\"$schema\":\"http://json-schema.org/draft-07/schema#\",\"definitions\":{\"City\":{\"title\":\"City\",\"type\":\"object\",\"properties\":{\"name\":{\"type\":\"string\",\"description\":\"The city'\''s name.\"},\"zipCode\":{\"type\":\"integer\",\"description\":\"The zip code.\",\"minimum\":0}}},\"Identifier\":{\"title\":\"Identifier\",\"type\":\"object\",\"properties\":{\"identifier\":{\"type\":\"integer\",\"description\":\"The citizen identifier.\",\"minimum\":0}}}}}",
      "contentType": "application/json"
    }
  }
}'

##
# OPENAPI reference to JSON Schema
#
curl -X POST "http://localhost:8080/apis/registry/v3/groups/demo/artifacts?ifExists=CREATE_VERSION" \
  -H "Content-Type: application/json" \
  --data-raw '{
    "artifactId":"user-schema",
    "artifactType":"OPENAPI",
    "name":"Citizen API",
    "description":"Citizen API OAS",
    "labels":{},
    "firstVersion":{
      "version":"1.0.0",
      "content":{
        "content":"{\"openapi\":\"3.0.0\",\"info\":{\"title\":\"Citizen API\",\"version\":\"1.0.0\",\"description\":\"Simple API that returns a Citizen object.\"},\"paths\":{\"/citizens/{identifier}\":{\"get\":{\"summary\":\"Get a citizen by identifier\",\"operationId\":\"getCitizenByIdentifier\",\"parameters\":[{\"name\":\"identifier\",\"in\":\"path\",\"required\":true,\"schema\":{\"type\":\"string\"},\"description\":\"Unique identifier of the citizen.\"}],\"responses\":{\"200\":{\"description\":\"Citizen found\",\"content\":{\"application/json\":{\"schema\":{\"$ref\":\"#/components/schemas/Citizen\"}}}},\"404\":{\"description\":\"Citizen not found\"}}}}},\"components\":{\"schemas\":{\"Citizen\":{\"title\":\"Citizen\",\"type\":\"object\",\"properties\":{\"firstName\":{\"type\":\"string\",\"description\":\"First name of the citizen.\"},\"lastName\":{\"type\":\"string\",\"description\":\"Last name of the citizen.\"},\"age\":{\"type\":\"integer\",\"minimum\":0,\"description\":\"Age in years, must be zero or greater.\"},\"city\":{\"$ref\":\"types/all-types.json#/definitions/City/properties/name\"},\"identifier\":{\"$ref\":\"types/all-types.json#/definitions/Identifier\"}},\"required\":[\"city\"]}}}}",
        "contentType":"application/json",
        "references":[
          {
            "name":"types/all-types.json#/definitions/City/properties/name",
            "groupId": "demo",
            "artifactId":"all-types",
            "version":"1"
          },
          {
            "name":"types/all-types.json#/definitions/Identifier",
            "groupId": "demo",
            "artifactId":"all-types",
            "version":"1"
          }
        ]
      },
      "name":"Citizen API 1.0.0",
      "description":"Initial version of the Citizen API",
      "branches":["1","1.0","1.0.0"],
      "isDraft":false
    }
}'

##
# JSON Schema reference to JSON Schema
#
curl -X POST "http://localhost:8080/apis/registry/v3/groups/demo/artifacts?ifExists=CREATE_VERSION" \
  -H "Content-Type: application/json" \
  --data-raw '{
    "artifactId":"citizen-schema",
    "artifactType":"JSON",
    "name":"Citizen JSON Schema",
    "description":"Citizen JSON Schema",
    "labels":{},
    "firstVersion":{
      "version":"1.0.0",
      "content":{
        "content":"{\"$schema\":\"https://json-schema.org/draft/2020-12/schema\",\"$id\":\"user-schema.json\",\"title\":\"User\",\"type\":\"object\",\"required\":[\"id\",\"name\",\"city\"],\"properties\":{\"id\":{\"type\":\"string\",\"description\":\"Unique identifier of the user\"},\"name\":{\"type\":\"string\",\"description\":\"Full name of the user\"},\"city\":{\"$ref\":\"types/all-types.json#/definitions/City/properties/name\",\"description\":\"City name, reused from the City definition\"}},\"additionalProperties\":false}",
        "contentType":"application/json",
        "references":[
          {
            "name":"types/all-types.json#/definitions/City/properties/name",
            "groupId": "demo",
            "artifactId":"all-types",
            "version":"1"
          }
        ]
      },
      "name":"Citizen Schema 1.0.0",
      "description":"Initial version of the Citizen Schema",
      "branches":["1","1.0","1.0.0"],
      "isDraft":false
    }
}'

## 
# OPENAPI referencing JSON Schema referencing other JSON Schema
#
curl -X POST "http://localhost:8080/apis/registry/v3/groups/demo/artifacts?ifExists=CREATE_VERSION" \
  -H "Content-Type: application/json" \
  --data-raw '{
    "artifactId":"oas-referencing-json-schema",
    "artifactType":"OPENAPI",
    "name":"OAS referencing JSON Schema",
    "description":"OpenAPI referencing a JSON Schema which itself references another JSON Schema",
    "labels":{},
    "firstVersion":{
      "version":"1.0.0",
      "content":{
        "content":"{\"openapi\":\"3.0.0\",\"info\":{\"title\":\"OAS referencing JSON Schema\",\"version\":\"1.0.0\"},\"paths\":{\"/citizens/{identifier}\":{\"get\":{\"summary\":\"Get a citizen by identifier\",\"operationId\":\"getCitizenByIdentifier\",\"parameters\":[{\"name\":\"identifier\",\"in\":\"path\",\"required\":true,\"schema\":{\"type\":\"string\"},\"description\":\"Unique identifier of the citizen.\"}],\"responses\":{\"200\":{\"description\":\"Citizen found\",\"content\":{\"application/json\":{\"schema\":{\"$ref\":\"urn:apicurio:registry:demo:citizen-schema:1.0.0\"}}}},\"404\":{\"description\":\"Citizen not found\"}}}}}},\"components\":{}}",
        "contentType":"application/json",
        "references":[
          {
            "name":"urn:apicurio:registry:demo:citizen-schema:1.0.0",
            "groupId": "demo",
            "artifactId":"citizen-schema",
            "version":"1.0.0"
          }
        ]
      },
      "name":"OAS referencing JSON Schema 1.0.0",
      "description":"Initial version of the OAS referencing a JSON Schema which itself references another JSON Schema",
      "branches":["1","1.0","1.0.0"],
      "isDraft":false
    }
}'

##
# ASYNCAPI referencing AVRO schema
#
curl -X POST "http://localhost:8080/apis/registry/v3/groups/demo/artifacts?ifExists=CREATE_VERSION" \
  -H "Content-Type: application/json" \
  --data-raw '{
    "artifactId":"asyncapi-with-avro",
    "artifactType":"ASYNCAPI",
    "name":"AsyncAPI with Avro",
    "description":"AsyncAPI referencing an Avro schema",
    "labels":{},
    "firstVersion":{
      "version":"1.0.0",
      "content":{
        "content":"{\"asyncapi\":\"2.0.0\",\"info\":{\"title\":\"User Service\",\"version\":\"1.0.0\"},\"channels\":{\"user/signedup\":{\"subscribe\":{\"message\":{\"$ref\":\"#/components/messages/UserSignedUpMessage\"}}}},\"components\":{\"messages\":{\"UserSignedUpMessage\":{\"payload\":{\"$ref\":\"urn:apicurio:registry:demo:Item:1.0.1\"}}}}}",
        "contentType":"application/json",
        "references":[
          {
            "name":"urn:apicurio:registry:demo:Item:1.0.1",
            "groupId": "demo",
            "artifactId":"Item",
            "version":"1.0.1"
          }
        ]
      },
      "name":"AsyncAPI with Avro 1.0.0",
      "description":"Initial version of the AsyncAPI referencing an Avro schema",
      "branches":["1","1.0","1.0.0"],
      "isDraft":false
    }
}'
