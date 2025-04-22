# Kubernetes-based Event Driven Autoscaling with KEDA - A Practical Guide
This repository contains source code for the article [Kubernetes-based Event Driven Autoscaling with KEDA- A Practical Guide](https://medium.com/@digitalpower/kubernetes-based-event-driven-autoscaling-with-keda-a-practical-guide-ed29cf482e7b)

Since the Openshift developer sandbox does not allow install of the KEDA operator we will use a cronjob as an alternative.

# Repository Structure
* The folder `manifests` contains a number of manifests for deploying K8S resources into the Minikube cluster:
  * `deployments/redis-deployment.yaml`: Contains definition for deploying a Redis server used as a dynamic scaling trigger.
  * `helpers/pvc-inspection.yaml`: Contains definition for an inspection pod.
  * `jobs/csv-processor-scaled-jobs.yaml`: Contains the definition of ScaledJob used for aggregating CSV files. Central file for KEDA.
  * `jobs/csv-processor.yaml`: Contains a job for testing the csv-processor.
  * `jobs/csv-processor-cronjob.yaml`: Contains a cronjob that triggers every minute a csv-processor job that aggregates one CSV file.
  * `jobs/data-generator.yaml`: Contains definition for a job that generates raw CSV files that should be aggregated by the ScaledJob processes.
  * `services/redis-service.yaml`: Contains definition for a Redis service that exposes the Redis deployment within the cluster.
  * `volumes/data-pvc.yaml`: Contains definition for a Persitent Volume Claim used for storing and reading CSV data.
* The folder `src` contains two .py-files that are used for creating raw CSV data and for aggregating the CSV data:
  * `src/data_generator.py`: Contains the code needed for generating the CSV files. Is used in the data-generator definition via the `data_generator.Dockerfile` image.
  * `src/process_csv.py`: Contains the code needed for aggregating CSV files. Used in the ScaledJob definition via the `csv_processor.Dockerfile` image.
* The root folder contains the definitions of the `data_generator.Dockerfile` and `csv_processor.Dockerfile`, which are used in the `jobs`.

# Tutorial

What we will do is:
* Set up a PVC that will contain a directory raw which contains files that need to be processed.
* Set up a redis instance which holds a list (queue) of files to be processed.
* Run a job to create the raw CSV files.
* Set up a cronjob that starts a job every minute that processes one raw file and places it in the processed directory of the PVC.

```
# Let's do the tutorial on Openshift
cd tutorial-kubernetes-event-driven-autoscaling

# First we deploy redis, both the deployment and the service
oc apply -f manifests/deployments/redis-deployment.yaml
oc apply -f manifests/services/redis-service.yaml
oc get deployments
oc get pods
oc get services

# Openshift does not like it when redis writes to the local filesystem.
# We will disable persistance by changing the redis configuration.
# DO NOT SKIP THIS and repeat this when the redis pod is restarted.
oc exec -it deployment/redis -- sh
# you are now in the redis pod
redis-cli CONFIG SET appendonly no
redis-cli CONFIG SET save ""
# press CTRL-D to get out of the pod

# Now we create a PVC
oc apply -f manifests/volumes/data-pvc.yaml
oc get pvc

# Now we create a pod to check the contents of the PVC
oc apply -f manifests/helpers/pvc-inspection.yaml
oc get pvc

kubectl exec -it pvc-inspection-pod -- sh
# you are now in the inspection pod
cd data
ls
# press CTRL-D to get out of the pod

# The jobs will use prebuilt images from the docker.io janbakkerhch repository.
        # YOU MAY SKIP THIS STEP
        # But you may build and use your own images...
        # Build the docker images locally
        podman build -t csvprocessor -f csv_processor.Dockerfile .
        podman build -t datagenerator -f data_generator.Dockerfile .

        # Push the images to our openshift image registry
        export REGISTRY_HOST=$(oc registry info)
        export REGISTRY_NAME=$( oc config view --minify -o 'jsonpath={..namespace}')
        echo $REGISTRY_HOST/$REGISTRY_NAME
        podman login -u `oc whoami` -p `oc whoami --show-token` $REGISTRY_HOST
        podman tag csvprocessor $REGISTRY_HOST/$REGISTRY_NAME/csvprocessor
        podman push $REGISTRY_HOST/$REGISTRY_NAME/csvprocessor
        podman tag datagenerator $REGISTRY_HOST/$REGISTRY_NAME/datagenerator
        podman push $REGISTRY_HOST/$REGISTRY_NAME/datagenerator
        # Update the yaml files in the manifests/jobs directory to use your own images.
        # END OF YOU MAY SKIP THIS STEP

# Generate the raw data
oc apply -f manifests/jobs/data-generator.yaml
oc get jobs
oc logs job/data-generator

# Get into the redis pod, check the length of the list and view the first three messages.
oc exec -it deployment/redis -- sh
redis-cli LLEN csvs-to-process
redis-cli LRANGE csvs-to-process 0 2
# press CTRL-D to get out of the pod

# Get into the inspection-pod, watch the raw files.
oc exec -it pvc-inspection-pod -- sh
cd data
ls
ls raw
# Later there will be processed files here
ls processed
# press CTRL-D to get out of the pod

# Start the cronjob, it will start a jop every minute
oc apply -f manifests/jobs/csv-processor-cronjob.yaml
oc get cronjob
oc get job
oc logs

# Check in the inspection-pod, watch the raw files being processed, one by one.
oc exec -it pvc-inspection-pod -- sh
cd data
ls processed
# press CTRL-D to get out of the pod
```


# The original info for KEDA.

In the article, the basics of Kubernetes Event Driven Autoscaling (KEDA) are first explained. After this is described how to install a lightweight local K8S cluster called Minikube, in which KEDA is also installed. To then demonstrate how KEDA works in practice, a use case is considered for dynamically scaling based on a certain amount of .csv-files that need processing. After following the guide, a person should be able to get KEDA up and running and have a good understanding of the core concepts of it.

# Getting Started
To get started with KEDA in practice, simply follow the steps that are outlined in the article.

# Contributing
We welcome contributions from the community! If you find a bug or would like to suggest a new feature, please create a Github issue and we'll take a look.

# About the Author
The article was written by [Tim Molleman](https://www.linkedin.com/in/tim-molleman/), a Data Engineer at [Digital Power](https://digital-power.com/en/)

If you're interested in learning more about how we use other cloud and its services to build scalable, resilient solutions for our customers, please check out our website.

The Openshift adaptation was done by Jan Bakker.