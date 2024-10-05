# Import necessary modules from LangGraph
from langgraph import LangGraph, Node, Edge

# Define a simple node that processes input
class SimpleResponseNode(Node):
    def process(self, input_text):
        # Basic response logic
        if "hello" in input_text.lower():
            return "Hello! How can I help you today?"
        elif "bye" in input_text.lower():
            return "Goodbye! Have a great day!"
        else:
            return "I'm not sure how to respond to that."

# Create a LangGraph instance
graph = LangGraph()

# Add the node to the graph
response_node = SimpleResponseNode()
graph.add_node(response_node)

# Define an edge that connects input to the response node
edge = Edge(input_node=None, output_node=response_node)
graph.add_edge(edge)

# Function to interact with the agent
def interact_with_agent(user_input):
    response = graph.process(user_input)
    print(response)

# Example interaction
interact_with_agent("Hello")
interact_with_agent("What's up?")
interact_with_agent("Bye")