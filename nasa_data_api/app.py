import graphene
from flask import Flask
from graphql_server.flask import GraphQLView
import requests

app = Flask(__name__)

# Define your GraphQL schema
class Query(graphene.ObjectType):
    hello = graphene.String(name=graphene.String(default_value="World"))

    def resolve_hello(self, info, name):
        return f'Hello {name}!'

schema = graphene.Schema(query=Query)

# Add the GraphQL endpoint to your Flask app
app.add_url_rule(
    '/graphql',
    view_func=GraphQLView.as_view('graphql', schema=schema, graphiql=True)
)

if __name__ == '__main__':
    app.run(debug=True)