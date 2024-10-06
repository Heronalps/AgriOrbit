from langchain_openai import ChatOpenAI
from langchain.agents import AgentExecutor, create_openai_tools_agent
from langchain_core.prompts import ChatPromptTemplate
from langgraph.prebuilt import create_react_agent
from langchain.agents import Tool 
from langchain.memory import ConversationBufferMemory

import os
from dotenv import load_dotenv
load_dotenv()

# Define custom tools for Instabase search and GLAM data processing
class InstabaseSearchTool:
    def search(self, query):
        """ Implement Instabase database search logic.
        Args:
            query (str): The search query.
        Returns:
            str: The search results.
        """
        pass

    def commit(self, data): 
        """ Implement Instabase database commit logic.
        Args:
            data (str): The data to be committed.
        Returns:
            str: The commit results.
        """
        pass

class GLAMDataProcessorTool:
    
    def getEvapotranspiration(self, raw_data):
        """ Implement GLAM data processing logic    
        Args:
            raw_data (str): The raw data from GLAM.
        Returns:
            str: The processed data.
        """
        pass

class LLMRequestTool:
    def request(self, prompt):
        """ Implement LLM request logic
        Args:
            prompt (str): The prompt for the LLM request.
        Returns:
            str: The LLM response.
        """
        pass

# Initialize tools
instabase_tool = InstabaseSearchTool()
glam_processor = GLAMDataProcessorTool()
llm_request_tool = LLMRequestTool()

#######################################################################################
# Search Agent
# An agent that searches the Instabase database, construct the prompt and search query,
# make the LLM request, and return the search results.
#######################################################################################

def create_search_agent():
    tools = [Tool(name="Instabase_Search", func=instabase_tool.search, description="Search the Instabase database and return relevant information.")]
    model = ChatOpenAI(model="gpt-3.5-turbo")
    prompt = ChatPromptTemplate.from_messages([
        ("system", "You are an agent that searches the Instabase database."),
        ("human", '{{user_input}}'),
        ("human", "Search the Instabase database and return relevant information."),
        ("human", "Thought process and actions: {agent_scratchpad}")
    ])
    search_agent = create_openai_tools_agent(model, tools, prompt)
    return AgentExecutor(agent=search_agent, tools=tools, memory=ConversationBufferMemory(return_messages=True))

################################################################################################
# Data Processor
# This is an offline data processor that digest the raw data from GLAM, extract structured data, 
# process them with the built-in workflow, and store the insights to the Instabase.
################################################################################################

def create_data_processor_agent():
    tools = [Tool(name="GLAM_Data_Processor", func=glam_processor.getEvapotranspiration, description="Process the data, extract structured information, and store insights in Instabase.")]
    model = ChatOpenAI(model="gpt-3.5-turbo")
    prompt = ChatPromptTemplate.from_messages([
        ("system", "You are an offline data processor that digests raw data from GLAM."),
        ("human", '{{user_input}}'),
        ("human", "Process the data, extract structured information, and store insights in Instabase.")
    ])
    processor_agent = create_react_agent(model, tools)
    return AgentExecutor(agent=processor_agent, tools=tools, memory=ConversationBufferMemory(return_messages=True))

################################################################################################
# LLM Request Agent
# This is the LLM request agent that makes the LLM request with both the system and user prompt.
################################################################################################

def create_llm_request_agent():
    tools = [Tool(name="LLM_Request", func=llm_request_tool.request, description="Make the LLM request with both the system and user prompt.")]
    model = ChatOpenAI(model="gpt-3.5-turbo")
    prompt = ChatPromptTemplate.from_messages([
        ("system", "You are an LLM request agent that makes the LLM request with both the system and user prompt."),
        ("human", '{{user_input}}'),
        ("human", "Make the LLM request with both the system and user prompt.")
    ])
    llm_request_agent = create_react_agent(model, tools)
    return AgentExecutor(agent=llm_request_agent, tools=tools, memory=ConversationBufferMemory(return_messages=True))

# Create agent instances
search_agent = create_search_agent()
data_processor_agent = create_data_processor_agent()
llm_request_agent = create_llm_request_agent()