var React = require('react-native');
var {
  Image,
  ListView,
  TouchableHighlight,
  StyleSheet,
  Text,
  View,
} = React;
var UIExplorerPage = require('./UIExplorerPage');
var ListViewSimpleExample = React.createClass({
  statics: {
    title: '<ListView> - Simple',
    description: 'Performant, scrollable list of data.'
  },
  getInitialState: function() {
    var ds = new ListView.DataSource({rowHasChanged: (r1, r2) => r1 !== r2});
    return {
      dataSource: ds.cloneWithRows(this._genRows({})),
    };
  },
  _pressData: ({}: {[key: number]: boolean}),
  componentWillMount: function() {
    this._pressData = {};
  },
  render: function() {
    return (
      <UIExplorerPage
        title={this.props.navigator ? null : '<ListView> - Simple'}
        noSpacer={true}
        noScroll={true}>
        <ListView
          dataSource={this.state.dataSource}
          renderRow={this._renderRow}
        />
      </UIExplorerPage>
    );
  },
  _renderRow: function(rowData: string, sectionID: number, rowID: number) {
    var rowHash = Math.abs(hashCode(rowData));
    var imgSource = {
      uri: THUMB_URLS[rowHash % THUMB_URLS.length],
    };
    return (
      <TouchableHighlight onPress={() => this._pressRow(rowID)}>
        <View>
          <View style={styles.row}>
            <Image style={styles.thumb} source={imgSource} />
            <Text style={styles.text}>
              {rowData + ' - ' + LOREM_IPSUM.substr(0, rowHash % 301 + 10)}
            </Text>
          </View>
          <View style={styles.separator} />
        </View>
      </TouchableHighlight>
    );
  }
});