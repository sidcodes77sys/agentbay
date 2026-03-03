from setuptools import setup, find_packages

setup(
    name="agentbay-sdk",
    version="0.1.0",
    description="Python SDK for building and publishing AI agents on AgentBay",
    long_description=open("README.md").read(),
    long_description_content_type="text/markdown",
    author="AgentBay",
    url="https://github.com/sidcodes77sys/agentbay",
    packages=find_packages(),
    python_requires=">=3.9",
    install_requires=[
        "requests>=2.31.0",
    ],
    classifiers=[
        "Programming Language :: Python :: 3",
        "License :: OSI Approved :: MIT License",
        "Operating System :: OS Independent",
    ],
)
