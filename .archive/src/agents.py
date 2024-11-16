from langchain_openai import ChatOpenAI
from langchain.agents import AgentExecutor, create_openai_tools_agent
from langchain_core.prompts import ChatPromptTemplate
from langgraph.prebuilt import create_react_agent
from langchain.agents import Tool 
from langchain.memory import ConversationBufferMemory

import secrets
import os, time, json, requests
from requests import Response
from typing import Dict, Text, Tuple, Any
from dotenv import load_dotenv
load_dotenv()


# Define custom tools for Instabase search and GLAM data processing
class InstabaseSearchTool:
    """

    """
    self.api_headers = {
    'Authorization': f'Bearer {secrets.API_TOKEN}',
    'IB-Context': f'{secrets.IB_CONTEXT}'
    }
    self.url = 'https://aihub.instabase.com/api/v2/queries'
    
    def query_chatbot(self, api_response, query: Text):
        """ Implement Instabase knowledgebase query logic.
        Args:
            api_response (str): The API response from GLAM.
            query (str): The search query.
        Returns:
            query_id (str): The query id.
        """
        print('Querying chatbot')

        prompt_eng = f"Weather data: {api_response}\nFarmer's question: {query}"  ##TODO: engineer this better

        payload = {
            "query": prompt_eng,
            "source_app": {
                "type": "CHATBOT",
                "id": secrets.CHATBOT_ID
            },
            "model": "multistep",
            "include_source_info": True
            }

        response = requests.post(url=self.url, headers=self.api_headers, data=json.dumps(payload))
        return response.json()['query_id']
    
    def run_query(self, api_response, query: Text):
        # Query the chatbot
        response = self.query_chatbot(api_response, query: Text)
        query_id = None
        if response.ok:
            resp_data = response.json()
            query_id = resp_data.get('query_id')
            if not query_id:
                print('Unable to query the chatbot.')

            print(f'Response from query chatbot : {resp_data}')
        else:
            print(f'Unable to connect to the chatbot query API - {response}.')
            print(f'Response status code: {response.status_code}')
            print(f'Response content: {response.text}')

    def get_query_status(query_id: Text) -> Tuple[Dict, Text]:
        # API call to get response for query_id
        print(f'Getting query request status for {query_id}')
        while True:
            response = requests.get(f'{url}/{query_id}', headers=self.api_headers)
            if not response.ok:
                return None, f'Error while getting the status for query request :  {response.status_code} - {response.text}'

            response_json = response.json()
            status = response_json.get('status')
            if not status:
                return None, f'Getting the status for query request : {response_json}'

            # If status of query request is COMPLETE stop polling and return
            if status in ['COMPLETE']:
                return response_json, None

            print('Query still processing, please wait!')

            # If it is RUNNING, the script waits for 5 seconds before the next poll
            time.sleep(5)

    def get_answer(self, query_id: Text): 
        """ Implement Instabase logic to get query response.
        Args:
            query_id (str): The query id.
        Returns:
            str: The commit results.
        """
        # Get the status of query request
        if query_id:
            response_json, err = self.get_query_status(query_id=query_id)
        if err:
            print(f'Error occurred: {err}')
        else:
            print(f'Query request status : {response_json}')


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