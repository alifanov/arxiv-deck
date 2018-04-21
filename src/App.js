import React, {Component} from 'react';
import './styles/bootstrap.css';
import './styles/App.css';

import axios from 'axios';
import {parseString} from 'xml2js';
import moment from 'moment';

function addOrRemove(array, value) {
    let index = array.indexOf(value);

    if (index === -1) {
        array.push(value);
    } else {
        array.splice(index, 1);
    }
}

class App extends Component {
    constructor(props) {
        super(props);
        let cats = localStorage.getItem('categories');
        if (!cats){
            cats = ['cs.AI', 'stat.ML', 'cs.LG'];
        }
        else {
            cats = JSON.parse(cats);
        }
        this.state = {
            articles: [],
            period: 'day',
            loading: false,
            cats: cats
        };
    }

    getStartDate = () => {
        let diff = 1;
        if (this.state.period === 'yesterday') {
            diff = 2;
        }
        if (this.state.period === 'week') {
            diff = 8;
        }
        if (this.state.period === 'month') {
            diff = 30;
        }
        return moment().subtract(diff, 'days').format('YYYYMMDD0000')
    };

    getEndDate = () => {
        let diff = 1;
        return moment().subtract(diff, 'days').format('YYYYMMDD2359')
    };

    onChangePeriod = (newPeriod) => {
        this.setState({period: newPeriod}, this.loadArticles);
    };

    onChangeCategory = (cat) => {
        let newCats = this.state.cats;
        addOrRemove(newCats, cat);
         localStorage.setItem('categories', JSON.stringify(newCats));
        this.setState({cats: newCats}, this.loadArticles);
    };

    loadArticles = () => {
        this.setState({loading: true});
        let cats = this.getCategories();
        if (cats.length > 0){
            cats = '(' + cats + ') AND '
        }
        axios.get('https://export.arxiv.org/api/query', {
            params: {
                search_query: cats + 'lastUpdatedDate:[' + this.getStartDate() + ' TO ' + this.getEndDate() + ']',
                max_results: 800,
                sortBy: 'lastUpdatedDate',
                sortOrder: 'descending'
            }
        })
            .then(response => {
                this.setState({loading: false});
                parseString(response.data, (err, result) => {
                    this.setState({
                        articles: result['feed']['entry'].map(v => {
                            return {
                                title: v.title,
                                summary: v.summary,
                                category: v.category,
                                link: v.link,
                                updated: v.updated
                            }
                        })
                    });
                })
            })
            .catch(err => console.log('Error: ', err))
    };

    componentWillMount = () => {
        this.loadArticles();
    };

    getCategories = () => {
        return (this.state.cats.length > 0) ? this.state.cats.map(c => 'cat:' + c).reduce((prev, curr) => [prev, ' OR ', curr]): [];
    };

    getPeriodClass = (period) => {
        return "btn btn-primary " + ((this.state.period === period) ? 'active' : '');
    };

    getCategoryClass = (cat) => {
        return "btn btn-primary " + ((this.state.cats.indexOf(cat) !== -1) ? 'active' : '');
    };

    renderPeriodFilter = () => {
        return (
            <div className='btn-group mr-2'>
                <button className={this.getPeriodClass('day')} onClick={() => this.onChangePeriod('day')}>
                    Today
                </button>
                <button className={this.getPeriodClass('yesterday')} onClick={() => this.onChangePeriod('yesterday')}>
                    2 days
                </button>
                <button className={this.getPeriodClass('week')} onClick={() => this.onChangePeriod('week')}>
                    This week
                </button>
                <button className={this.getPeriodClass('month')} onClick={() => this.onChangePeriod('month')}>
                    This month
                </button>
            </div>
        )
    };

    renderCategoriesFilter = () => {
        return (
            <div className='btn-group'>
                {['cs.CV', 'cs.CL', 'cs.AI', 'cs.LG', 'cs.NE', 'stat.ML'].map(v => (
                    <button key={v} className={this.getCategoryClass(v)} onClick={() => this.onChangeCategory(v)}>
                        {v}
                    </button>
                ))}
            </div>
        )
    };

    render() {
        let dateText = 'Today';
        if (this.state.period === 'yesterday') {
            dateText = 'Today and yesterday';
        }
        if (this.state.period === 'week') {
            dateText = 'This week';
        }
        if (this.state.period === 'month') {
            dateText = 'This month';
        }

        return (
            <div className="container">
                <div className={'btn-toolbar'}>
                    {this.renderPeriodFilter()}
                    {this.renderCategoriesFilter()}
                </div>

                <div className="info">
                    {!this.state.loading && <h3>{dateText} articles for
                        {(this.state.cats.length > 0) ? this.state.cats.reduce((prev, curr) => [prev, ', ', curr]) : ' all '}
                        categories
                    </h3>}
                    {(this.state.loading) ? <div>Loading...</div> : <div>Total: {this.state.articles.length}</div>}

                </div>

                {!this.state.loading && this.state.articles.map((v, i) => {
                    return (<div key={i} className='card'>
                        <div className="card-body">
                            <a href={v.link[1]['$'].href} target='_blank'>
                                <b>{v.title}</b>
                            </a>

                            <div>
                                {v.category.map((v, i) => (
                                    <span key={i} className={'badge badge-light'}>{v['$'].term}</span>
                                ))}
                            </div>

                            <div>
                                Date: {moment(v.updated[0]).format("DD.MM.YYYY")}
                            </div>
                        </div>
                    </div>)
                })}
            </div>
        );
    }
}

export default App;
