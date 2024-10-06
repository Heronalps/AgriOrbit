from typing import Sequence, TypedDict
from typing_extensions import Annotated
from langchain_core.messages import BaseMessage, HumanMessage
from langgraph.graph import StateGraph, END
from agents import search_agent, data_processor_agent, llm_request_agent
import operator

# Define the state type
class AgentState(TypedDict):
    messages: Annotated[Sequence[BaseMessage], operator.add]
    current_agent: str

# Define edges and logic
def route_agent(state):
    last_message = state["messages"][-1].content.lower()
    if "process" in last_message or "data" in last_message:
        return "process"
    elif "request" in last_message or "llm" in last_message:
        return "request"
    return "search"

# Create the graph
workflow = StateGraph(AgentState)

# Add agent nodes
workflow.add_node("search", lambda state: search_agent.invoke({"user_input": state["messages"][-1].content}))
workflow.add_node("process", lambda state: data_processor_agent.invoke({"user_input": state["messages"][-1].content}))
workflow.add_node("request", lambda state: llm_request_agent.invoke({"user_input": state["messages"][-1].content}))
workflow.add_node("route_agent", route_agent) 

workflow.add_edge("search", "route_agent")
workflow.add_edge("process", "route_agent")
workflow.add_edge("request", "route_agent")
workflow.set_entry_point("search")

workflow.add_conditional_edges("search", route_agent, {"search": "search", "process": "process", "request": "request"})
workflow.add_conditional_edges("process", route_agent, {"search": "search", "process": "process", "request": "request"})
workflow.add_conditional_edges("request", route_agent,{"search": "search", "process": "process", "request": "request"})

# Compile the graph
graph = workflow.compile()

# Use the graph
config = {"configurable": {"thread_id": "abc123"}}
for chunk in graph.stream({
    "messages": [HumanMessage(content="Search for recent Evapotranspiration data")],
    "current_agent": "search"
}, config=config):
    print(chunk)