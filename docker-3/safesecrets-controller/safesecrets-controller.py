from kubernetes import client, config, watch
import base64

def create_secret(namespace, name, data):
    core_v1_api = client.CoreV1Api()
    secret = client.V1Secret(
        metadata=client.V1ObjectMeta(namespace=namespace, name=name),
        data=data
    )
    core_v1_api.create_namespaced_secret(namespace=namespace, body=secret)

def delete_secret(namespace, name):
    core_v1_api = client.CoreV1Api()
    core_v1_api.delete_namespaced_secret(name=name, namespace=namespace)

def main():
    config.load_incluster_config()  # Use in-cluster configuration
    api_instance = client.CustomObjectsApi()
    group = "janbakker.com"  # Update to the correct API group
    version = "v1"  # Update to the correct API version
    namespace = "default"  # Assuming custom resource is in default namespace
    plural = "safesecrets"  # Update to the correct plural form of your custom resource

    # Watch for events on custom resource
    resource_version = ""
    while True:
        stream = watch.Watch().stream(
            api_instance.list_namespaced_custom_object,
            group, version, namespace, plural,
            resource_version=resource_version
        )
        for event in stream:
            custom_resource = event['object']
            event_type = event['type']

            # Extract custom resource name
            resource_name = custom_resource['metadata']['name']

            # Extract key-value pairs from the custom resource spec
            resource_data = custom_resource.get('spec', {})

            # Handle events of type ADDED (resource created)
            if event_type == "ADDED":
                data = {}
                for key, value in resource_data.items():
                    bytes = base64.b16decode(str(value).upper())
                    bytes = base64.b64encode(bytes)
                    data[key] = bytes.decode('utf-8')
                create_secret(namespace=namespace, name=resource_name, data=data)

            # Handle events of type DELETED (resource deleted)
            elif event_type == "DELETED":
                delete_secret(namespace=namespace, name=resource_name)

            # Update resource_version to resume watching from the last event
            resource_version = custom_resource['metadata']['resourceVersion']

if __name__ == "__main__":
    main()
